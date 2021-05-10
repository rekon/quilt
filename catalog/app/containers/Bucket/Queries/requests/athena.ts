import Athena from 'aws-sdk/clients/athena'

import * as AWS from 'utils/AWS'
import { useData } from 'utils/Data'

import { AsyncData } from './requests'

interface QueriesArgs {
  athena: Athena
  workgroup: string
}

export interface AthenaQuery {
  body: string
  description?: string
  key: string
  name: string
}

type QueriesResponse = AthenaQuery[]

async function fetchQueries({
  athena,
  workgroup,
}: QueriesArgs): Promise<QueriesResponse> {
  try {
    const queryIdsData = await athena
      ?.listNamedQueries({ WorkGroup: workgroup })
      .promise()
    if (!queryIdsData.NamedQueryIds || !queryIdsData.NamedQueryIds.length) return []

    const queriesData = await athena
      ?.batchGetNamedQuery({ NamedQueryIds: queryIdsData.NamedQueryIds })
      .promise()
    return (queriesData.NamedQueries || []).map((query) => ({
      body: query.QueryString,
      description: query.Description,
      key: query.NamedQueryId!,
      name: query.Name,
    }))
  } catch (e) {
    // eslint-disable-next-line no-console
    console.log('Unable to fetch')
    // eslint-disable-next-line no-console
    console.error(e)
    throw e
  }
}

export function useQueries(workgroup: string): AsyncData<QueriesResponse> {
  const athena = AWS.Athena.use()
  return useData(fetchQueries, { athena, workgroup }, { noAutoFetch: !workgroup })
}

interface WorkgroupsArgs {
  athena: Athena
}

export interface Workgroup {
  key: string // for consistency
  name: string
}

export type WorkgroupsResponse = Workgroup[]

async function fetchWorkgroups({ athena }: WorkgroupsArgs): Promise<WorkgroupsResponse> {
  try {
    const workgroupsData = await athena.listWorkGroups().promise()
    return (workgroupsData.WorkGroups || []).map(({ Name }) => ({
      key: Name || 'Unknown', // for consistency
      name: Name || 'Unknown',
    }))
  } catch (e) {
    // eslint-disable-next-line no-console
    console.log('Unable to fetch')
    // eslint-disable-next-line no-console
    console.error(e)
    throw e
  }
}

export function useWorkgroups(): AsyncData<WorkgroupsResponse> {
  const athena = AWS.Athena.use()
  return useData(fetchWorkgroups, { athena })
}

interface QueryExecutionsArgs {
  athena: Athena
  workgroup: string
}

export interface QueryExecution {
  catalog?: string
  completed?: Date
  created?: Date
  db?: string
  id?: string
  outputBucket?: string
  query?: string
  status?: string // 'QUEUED' | 'RUNNING' | 'SUCCEEDED' | 'FAILED' | 'CANCELLED'
}

type QueryExecutionsResponse = QueryExecution[]

async function fetchQueryExecutions({
  athena,
  workgroup,
}: QueryExecutionsArgs): Promise<QueryExecutionsResponse> {
  try {
    const executionIdsData = await athena
      .listQueryExecutions({ WorkGroup: workgroup })
      .promise()

    if (!executionIdsData.QueryExecutionIds || !executionIdsData.QueryExecutionIds.length)
      return []

    const executionsData = await athena
      ?.batchGetQueryExecution({ QueryExecutionIds: executionIdsData.QueryExecutionIds })
      .promise()
    return (executionsData.QueryExecutions || []).map((queryExecution) => ({
      catalog: queryExecution?.QueryExecutionContext?.Catalog,
      completed: queryExecution?.Status?.CompletionDateTime,
      created: queryExecution?.Status?.SubmissionDateTime,
      db: queryExecution?.QueryExecutionContext?.Database,
      id: queryExecution?.QueryExecutionId,
      outputBucket: queryExecution?.ResultConfiguration?.OutputLocation,
      query: queryExecution?.Query,
      status: queryExecution?.Status?.State,
    }))
  } catch (e) {
    // eslint-disable-next-line no-console
    console.log('Unable to fetch')
    // eslint-disable-next-line no-console
    console.error(e)
    throw e
  }
}

export function useQueryExecutions(
  workgroup: string,
): AsyncData<QueryExecutionsResponse> {
  const athena = AWS.Athena.use()
  return useData(fetchQueryExecutions, { athena, workgroup })
}

async function waitForQueryStatus(
  athena: Athena,
  QueryExecutionId: string,
): Promise<boolean> {
  const statusData = await athena.getQueryExecution({ QueryExecutionId }).promise()
  const status = statusData?.QueryExecution?.Status?.State
  if (status === 'FAILED' || status === 'CANCELLED') {
    throw new Error(status)
  }

  if (status === 'SUCCEEDED') {
    return true
  }

  return waitForQueryStatus(athena, QueryExecutionId)
}

export type QueryResultsResponse = object

async function fetchQueryResults({
  athena,
  queryExecutionId,
}: {
  athena: Athena
  queryExecutionId: string
}): Promise<QueryResultsResponse> {
  await waitForQueryStatus(athena, queryExecutionId)

  const results = await athena
    .getQueryResults({ QueryExecutionId: queryExecutionId })
    .promise()
  return results
}

export function useQueryResults(
  queryExecutionId: string | null,
): AsyncData<QueryResultsResponse> {
  const athena = AWS.Athena.use()
  return useData(
    fetchQueryResults,
    { athena, queryExecutionId },
    { noAutoFetch: !queryExecutionId },
  )
}

export interface QueryRunResponse {
  id: string
}

interface RunQueryArgs {
  athena: Athena
  queryBody: string
  workgroup: string
}

async function runQuery({
  athena,
  queryBody,
  workgroup,
}: RunQueryArgs): Promise<QueryRunResponse> {
  try {
    const { QueryExecutionId } = await athena
      .startQueryExecution({
        QueryString: queryBody,
        ResultConfiguration: {
          EncryptionConfiguration: {
            EncryptionOption: 'SSE_S3',
          },
          // OutputLocation: 's3://fiskus-sandbox-dev/fiskus/sandbox/'
        },
        WorkGroup: workgroup,
      })
      .promise()
    if (!QueryExecutionId) throw new Error('No execution id')
    return {
      id: QueryExecutionId,
    }
  } catch (e) {
    // eslint-disable-next-line no-console
    console.log('Unable to fetch')
    // eslint-disable-next-line no-console
    console.error(e)
    throw e
  }
}

export function useQueryRun(
  workgroup: string,
  queryBody: string,
): AsyncData<QueryRunResponse> {
  const athena = AWS.Athena.use()
  return useData(runQuery, { athena, queryBody, workgroup }, { noAutoFetch: !queryBody })
}
