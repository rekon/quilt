import boto3
import time


def get_athena_client():
    return boto3.client("athena")


def get_glue_client():
    return boto3.client("glue")


def query_and_wait(athena_client, sql, db_name, output_location):
    query_id = launch_query(athena_client, sql, db_name, output_location)
    status, status_response = wait_for_query_to_complete(athena_client, query_id)
    assert status == "SUCCEEDED", f"Query Did Not Succeed: {status}\nDetails: {status_response}"
    col_headers, rows = retrieve_results(athena_client, query_id)
    return col_headers, rows


def launch_query(athena_client, sql, db_name, output_location):
    # output_location is in form "s3://bucket/output_prefix/
    response = athena_client.start_query_execution(
            QueryString=sql,
            QueryExecutionContext={
                'Database': db_name
            },
            ResultConfiguration={
                'OutputLocation': output_location,
                'EncryptionConfiguration': {'EncryptionOption': 'SSE_S3'}
            },
    )
    return response['QueryExecutionId']


def wait_for_query_to_complete(athena_client, query_execution_id):
    while True:
        response = athena_client.get_query_execution(QueryExecutionId=query_execution_id)
        status = response["QueryExecution"]["Status"]["State"]
        if status in ["SUCCEEDED", "FAILED", "CANCELLED"]:
            return status, response
        time.sleep(1)
        # TODO: Print out feedback to the user


def retrieve_results(athena_client, query_execution_id):
    response = athena_client.get_query_results(QueryExecutionId=query_execution_id)
    # return format:
    # https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/athena.html#Athena.Client.get_query_results
    column_info_list = response['ResultSet']['ResultSetMetadata']['ColumnInfo']

    col_headers = [c['Name'] for c in column_info_list]
    col_types = [c['Type'] for c in column_info_list]
    rows = []
    for i, raw_row in enumerate(response['ResultSet']['Rows']):
        if i == 0:
            continue  # skip header row
        row = []
        for j, col in enumerate(raw_row['Data']):

            # In some cases such as repair table (where an info string is returned as a result row),
            # the column_info_list is empty despite results of some sort being present. In that
            # case we interpret everything as a varchar. Not certain that this is the right solution,
            # but since it isn't clear what other scenarios cause this, it seems like a fairly robust
            # solution

            if j < len(column_info_list):
                col_type = col_types[j]
            else:
                col_type = 'varchar'
            if 'VarCharValue' in col:
                d = col['VarCharValue']
            else:
                d = None
            row.append(transform_entry(d, col_type))
        rows.append(row)

    return col_headers, rows


def describe_query_execution_performance(query_execution_id):
    response = get_athena_client().get_query_execution(QueryExecutionId=query_execution_id)
    status = response["QueryExecution"]["Status"]["State"] == "SUCCEEDED"
    assert status, f"Query must have succeeded to get performance numbers. Query is currently {status}"
    stats = response["QueryExecution"]["Statistics"]
    return stats["EngineExecutionTimeInMillis"], stats["DataScannedInBytes"]

    # exec_dur, data_scanned = describe_query_execution_performance(query_execution_id)
    #     print(exec_dur/1000, "seconds,", data_scanned/1024/1024, "megabytes scanned")


def results_as_pandas_dataframe(col_headers, rows):
    import pandas as pd
    cols = []
    num_cols = len(col_headers)
    for i in range(num_cols):
        cols.append([])

    for row in rows:
        for i in range(num_cols):
            cols[i].append(row[i])
    results = {}
    for i, col_header in enumerate(col_headers):
        results[col_header] = cols[i]
    return pd.DataFrame(results)


def transform_entry(var_char_value, col_type):
    """
    Type conversion mapping handles all current metadata service types, but might not be comprehensive for future types
    if table column types are changed
    """
    if col_type == "varchar":
        return var_char_value
    elif col_type == "date":
        # TODO: Parse date correctly?
        return var_char_value
    elif col_type == "integer":
        return int(var_char_value)
    elif col_type == "bigint":
        return int(var_char_value)
    elif col_type == "double":
        return float(var_char_value)
    elif col_type == "json":
        return var_char_value
    else:
        raise NotImplementedError(f"Don't know how to parse {col_type}")


def get_database_names(glue_client):
    # TODO: Paginate properly
    resp = glue_client.get_databases()
    # https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/glue.html#Glue.Client.get_databases

    databases = []
    for db in resp["DatabaseList"]:
        databases.append(db["Name"])
    return databases


def database_exists(glue_client, db_name):
    return db_name in get_database_names(glue_client)


def create_database(glue_client, db_name):
    glue_client.create_database(DatabaseInput={'Name': db_name})


def list_tables(glue_client, db_name):
    # TODO: Paginate properly
    response = glue_client.get_tables(DatabaseName=db_name)
    # https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/glue.html#Glue.Client.get_tables
    table_names = []
    for table in response["TableList"]:
        table_names.append(table["Name"])

    return table_names


def table_exists(glue_client, db_name, table_name):
    return table_name in list_tables(glue_client, db_name)
