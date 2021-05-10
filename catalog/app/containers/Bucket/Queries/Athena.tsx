import * as R from 'ramda'
import * as React from 'react'
import { RouteComponentProps } from 'react-router'
import * as M from '@material-ui/core'
import * as Lab from '@material-ui/lab'

import * as Sentry from 'utils/Sentry'

// FIXME: rename Fetcher components
//        show queryBody for queryExecutionId
//        create Empty components

import AthenaQueryViewer from './AthenaQueryViewer'
import ExecutionsViewer from './ExecutionsViewer'
import QueryResult from './QueryResult'
import QuerySelect from './QuerySelect'
import WorkgroupSelect from './WorkgroupSelect'
import * as requests from './requests'

interface AlertProps {
  error: Error
  title: string
}

function Alert({ error, title }: AlertProps) {
  const sentry = Sentry.use()
  sentry('captureException', error)

  return (
    <Lab.Alert severity="error">
      {title}: {error.message}
    </Lab.Alert>
  )
}

function makeAsyncDataErrorHandler(title: string) {
  return (error: Error) => <Alert error={error} title={title} />
}

interface SpinnerProps {
  size?: 'large'
}

function Spinner({ size }: SpinnerProps) {
  return (
    <M.Box pt={5} textAlign="center">
      <M.CircularProgress size={size === 'large' ? 96 : 48} />
    </M.Box>
  )
}

function makeAsyncDataPendingHandler(size?: 'large') {
  return () => <Spinner size={size} />
}

const useStyles = M.makeStyles((t) => ({
  actions: {
    margin: t.spacing(2, 0),
  },
  executions: {
    margin: t.spacing(0, 0, 4),
  },
  form: {
    margin: t.spacing(0, 0, 4),
  },
  results: {
    margin: t.spacing(4, 0, 0),
  },
  select: {
    margin: t.spacing(3, 0),
  },
  viewer: {
    margin: t.spacing(3, 0),
  },
}))

interface FormProps {
  disabled: boolean
  onChange: (value: string) => void
  onSubmit: (value: string) => () => void
  value: string | null
}

function Form({ disabled, value, onChange, onSubmit }: FormProps) {
  const classes = useStyles()

  return (
    <div className={classes.form}>
      <AthenaQueryViewer
        className={classes.viewer}
        onChange={onChange}
        query={value || ''}
      />

      <div className={classes.actions}>
        <M.Button
          variant="contained"
          color="primary"
          disabled={disabled}
          onClick={onSubmit(value || '')}
        >
          Run query
        </M.Button>
      </div>
    </div>
  )
}

interface QueryExecutorRenderProps {
  queryRunData: requests.AsyncData<requests.athena.QueryRunResponse>
}

interface QueryExecutorProps {
  children: (props: QueryExecutorRenderProps) => React.ReactElement
  queryBody: string
  workgroup: string
}

function QueryExecutor({ children, queryBody, workgroup }: QueryExecutorProps) {
  const queryRunData = requests.athena.useQueryRun(workgroup, queryBody)
  return children({ queryRunData })
}
interface QueryResultsFetcherRenderProps {
  queryResultsData: requests.AsyncData<requests.athena.QueryResultsResponse>
}

interface QueryResultsFetcherProps {
  children: (props: QueryResultsFetcherRenderProps) => React.ReactElement
  queryExecutionId: string | null
}

function QueryResultsFetcher({ children, queryExecutionId }: QueryResultsFetcherProps) {
  const queryResultsData = requests.athena.useQueryResults(queryExecutionId)
  return children({ queryResultsData })
}

interface QueriesFetcherRenderProps {
  executionsData: requests.AsyncData<requests.athena.QueryExecution[]>
  queriesData: requests.AsyncData<requests.athena.AthenaQuery[]>
}

interface QueriesFetcherProps {
  children: (props: QueriesFetcherRenderProps) => React.ReactElement
  workgroup: string
}

function QueriesFetcher({ children, workgroup }: QueriesFetcherProps) {
  const queriesData = requests.athena.useQueries(workgroup)
  const executionsData = requests.athena.useQueryExecutions(workgroup)
  return children({ queriesData, executionsData })
}

interface QueriesStateRenderProps {
  customQueryBody: string | null
  executionsData: requests.AsyncData<requests.athena.QueryExecution[]>
  handleQueryBodyChange: (q: string | null) => void
  handleQueryMetaChange: (q: requests.Query | requests.athena.AthenaQuery | null) => void
  handleSubmit: (q: string) => () => void
  handleWorkgroupChange: (w: requests.athena.Workgroup | null) => void
  queriesData: requests.AsyncData<requests.athena.AthenaQuery[]>
  queryMeta: requests.athena.AthenaQuery | null
  queryResultsData: requests.AsyncData<requests.athena.QueryResultsResponse>
  queryRunData: requests.AsyncData<requests.athena.QueryRunResponse>
  workgroup: requests.athena.Workgroup | null
  workgroups: requests.athena.Workgroup[]
}

interface QueriesStateProps {
  children: (props: QueriesStateRenderProps) => React.ReactElement
  queryExecutionId: string | null
}

function QueriesState({ children, queryExecutionId }: QueriesStateProps) {
  // Info about query: name, url, etc.
  const [queryMeta, setQueryMeta] = React.useState<requests.athena.AthenaQuery | null>(
    null,
  )

  // Custom query content, not associated with queryMeta
  const [customQueryBody, setCustomQueryBody] = React.useState<string | null>(null)

  const handleQueryMetaChange = React.useCallback(
    (query) => {
      setQueryMeta(query as requests.athena.AthenaQuery | null)
      setCustomQueryBody(null)
    },
    [setQueryMeta, setCustomQueryBody],
  )

  // Query content requested to Elastic Search
  const [queryRequest, setQueryRequest] = React.useState<string | null>(null)

  const handleSubmit = React.useMemo(
    () => (body: string) => () => setQueryRequest(body),
    [setQueryRequest],
  )

  const workgroupsData = requests.athena.useWorkgroups()

  const [workgroup, setWorkgroup] = React.useState<requests.athena.Workgroup | null>(null)
  const handleWorkgroupChange = React.useCallback(
    (w) => {
      setWorkgroup(w)
    },
    [setWorkgroup],
  )

  return workgroupsData.case({
    Ok: (workgroups) => (
      <QueryResultsFetcher queryExecutionId={queryExecutionId}>
        {({ queryResultsData }) => (
          <QueriesFetcher workgroup={workgroup?.name || workgroups?.[0].name || ''}>
            {({ queriesData, executionsData }) => (
              <QueryExecutor
                queryBody={queryRequest || ''}
                workgroup={workgroup?.name || workgroups?.[0].name || ''}
              >
                {({ queryRunData }) =>
                  children({
                    customQueryBody,
                    executionsData,
                    handleQueryBodyChange: setCustomQueryBody,
                    handleQueryMetaChange,
                    handleSubmit,
                    handleWorkgroupChange,
                    queriesData,
                    queryMeta,
                    queryResultsData,
                    queryRunData,
                    workgroup: workgroup || workgroups?.[0],
                    workgroups,
                  })
                }
              </QueryExecutor>
            )}
          </QueriesFetcher>
        )}
      </QueryResultsFetcher>
    ),
    Err: makeAsyncDataErrorHandler('Workgroups Data'),
    _: makeAsyncDataPendingHandler(),
  })
}

const isButtonDisabled = (
  queryContent: string,
  resultsData: requests.AsyncData<requests.ElasticSearchResults>, // FIXME
  error: Error | null,
): boolean => !!error || !queryContent || !!resultsData.case({ Pending: R.T, _: R.F })

interface AthenaProps
  extends RouteComponentProps<{ bucket: string; queryExecutionId?: string }> {}

export default function Athena({
  match: {
    params: { bucket, queryExecutionId },
  },
}: AthenaProps) {
  const classes = useStyles()

  return (
    <QueriesState queryExecutionId={queryExecutionId || null}>
      {({
        customQueryBody,
        executionsData,
        handleQueryBodyChange,
        handleQueryMetaChange,
        handleSubmit,
        handleWorkgroupChange,
        queriesData,
        queryMeta,
        queryResultsData,
        queryRunData,
        workgroup,
        workgroups,
      }) => (
        <div>
          <M.Typography variant="h6">Athena SQL</M.Typography>
          <WorkgroupSelect
            className={classes.select}
            workgroups={workgroups}
            onChange={handleWorkgroupChange}
            value={workgroup}
          />

          {queriesData.case({
            Ok: (queries) => (
              <QuerySelect
                className={classes.select}
                queries={queries}
                onChange={handleQueryMetaChange}
                value={customQueryBody ? null : queryMeta}
              />
            ),
            Err: makeAsyncDataErrorHandler('Queries Data'),
            _: makeAsyncDataPendingHandler('large'),
          })}

          <Form
            disabled={isButtonDisabled(
              customQueryBody || queryMeta?.body || '',
              queryRunData,
              null,
            )}
            onChange={handleQueryBodyChange}
            onSubmit={handleSubmit}
            value={customQueryBody || queryMeta?.body || ''}
          />

          {executionsData.case({
            Ok: (executions) => (
              <ExecutionsViewer
                className={classes.executions}
                bucket={bucket}
                executions={executions}
              />
            ),
            Err: makeAsyncDataErrorHandler('Executions Data'),
            _: makeAsyncDataPendingHandler('large'),
          })}

          {queryResultsData.case({
            Init: () => null,
            Ok: (queryResults: requests.athena.QueryResultsResponse) => (
              <QueryResult results={queryResults} />
            ),
            Err: makeAsyncDataErrorHandler('Query Results Data'),
            _: makeAsyncDataPendingHandler('large'),
          })}
        </div>
      )}
    </QueriesState>
  )
}
