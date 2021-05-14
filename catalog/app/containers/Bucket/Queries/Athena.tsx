import * as R from 'ramda'
import * as React from 'react'
import { RouteComponentProps } from 'react-router'
import { Link } from 'react-router-dom'
import * as M from '@material-ui/core'
import * as Lab from '@material-ui/lab'

import * as NamedRoutes from 'utils/NamedRoutes'
import * as Sentry from 'utils/Sentry'

import * as requests from './requests'
import AthenaQueryViewer from './AthenaQueryViewer'
import AthenaResults from './AthenaResults'
import ExecutionsViewer from './ExecutionsViewer'
import QuerySelect from './QuerySelect'
import WorkgroupSelect from './WorkgroupSelect'

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
  padding?: number
  size?: 'large'
}

function Spinner({ padding, size }: SpinnerProps) {
  return (
    <M.Box pt={padding || 5} textAlign="center">
      <M.CircularProgress size={size === 'large' ? 96 : 48} />
    </M.Box>
  )
}

function makeAsyncDataPendingHandler({ padding, size }: SpinnerProps = {}) {
  return () => <Spinner padding={padding} size={size} />
}

const useStyles = M.makeStyles((t) => ({
  actions: {
    margin: t.spacing(2, 0),
  },
  emptySelect: {
    margin: t.spacing(4, 0, 0),
  },
  form: {
    margin: t.spacing(0, 0, 4),
  },
  results: {
    margin: t.spacing(4, 0, 0),
  },
  sectionHeader: {
    margin: t.spacing(0, 0, 1),
  },
  select: {
    flexBasis: '40%',
    '& + &': {
      flexBasis: '60%',
      marginLeft: t.spacing(3),
    },
  },
  selects: {
    display: 'flex',
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

interface QueryRunnerRenderProps {
  queryRunData: requests.AsyncData<requests.athena.QueryRunResponse>
}

interface QueryRunnerProps {
  children: (props: QueryRunnerRenderProps) => React.ReactElement
  queryBody: string
  workgroup: string
}

function QueryRunner({ children, queryBody, workgroup }: QueryRunnerProps) {
  const queryRunData = requests.athena.useQueryRun(workgroup, queryBody)
  return children({ queryRunData })
}
interface QueryResultsFetcherRenderProps {
  handleQueryResultsLoadMore: (prev: requests.athena.QueryResultsResponse) => void
  queryResultsData: requests.AsyncData<requests.athena.QueryResultsResponse>
}

interface QueryResultsFetcherProps {
  children: (props: QueryResultsFetcherRenderProps) => React.ReactElement
  queryExecutionId: string | null
}

function QueryResultsFetcher({ children, queryExecutionId }: QueryResultsFetcherProps) {
  const [prev, usePrev] = React.useState<requests.athena.QueryResultsResponse | null>(
    null,
  )
  const queryResultsData = requests.athena.useQueryResults(queryExecutionId, prev)
  return children({ queryResultsData, handleQueryResultsLoadMore: usePrev })
}

interface QueriesFetcherRenderProps {
  executionsData: requests.AsyncData<requests.athena.QueryExecutionsResponse>
  handleExecutionsLoadMore: (prev: requests.athena.QueryExecutionsResponse) => void
  handleQueriesLoadMore: (prev: requests.athena.QueriesResponse) => void
  queriesData: requests.AsyncData<requests.athena.QueriesResponse>
}

interface QueriesFetcherProps {
  children: (props: QueriesFetcherRenderProps) => React.ReactElement
  workgroup: string
}

function QueriesFetcher({ children, workgroup }: QueriesFetcherProps) {
  const [
    prevQueries,
    setPrevQueries,
  ] = React.useState<requests.athena.QueriesResponse | null>(null)
  const [
    prevExecutions,
    setPrevExecutions,
  ] = React.useState<requests.athena.QueryExecutionsResponse | null>(null)
  const queriesData = requests.athena.useQueries(workgroup, prevQueries)
  const executionsData = requests.athena.useQueryExecutions(workgroup, prevExecutions)
  return children({
    executionsData,
    handleExecutionsLoadMore: setPrevExecutions,
    handleQueriesLoadMore: setPrevQueries,
    queriesData,
  })
}

interface WorkgroupsFetcherRenderProps {
  workgroupsData: requests.AsyncData<requests.athena.WorkgroupsResponse>
  handleWorkgroupsLoadMore: (prev: requests.athena.WorkgroupsResponse) => void
}

interface WorkgroupsFetcherProps {
  children: (props: WorkgroupsFetcherRenderProps) => React.ReactElement
}

function WorkgroupsFetcher({ children }: WorkgroupsFetcherProps) {
  const [prev, setPrev] = React.useState<requests.athena.WorkgroupsResponse | null>(null)
  const workgroupsData = requests.athena.useWorkgroups(prev)
  return children({ handleWorkgroupsLoadMore: setPrev, workgroupsData })
}

interface QueriesStateRenderProps {
  customQueryBody: string | null
  executionsData: requests.AsyncData<requests.athena.QueryExecutionsResponse>
  handleExecutionsLoadMore: (prev: requests.athena.QueryExecutionsResponse) => void
  handleQueriesLoadMore: (prev: requests.athena.QueriesResponse) => void
  handleQueryBodyChange: (q: string | null) => void
  handleQueryMetaChange: (q: requests.Query | requests.athena.AthenaQuery | null) => void
  handleQueryResultsLoadMore: (prev: requests.athena.QueryResultsResponse) => void
  handleSubmit: (q: string) => () => void
  handleWorkgroupChange: (w: requests.athena.Workgroup | null) => void
  handleWorkgroupsLoadMore: (prev: requests.athena.WorkgroupsResponse) => void
  queriesData: requests.AsyncData<requests.athena.QueriesResponse>
  queryMeta: requests.athena.AthenaQuery | null
  queryResultsData: requests.AsyncData<requests.athena.QueryResultsResponse>
  queryRunData: requests.AsyncData<requests.athena.QueryRunResponse>
  workgroup: requests.athena.Workgroup | null
  workgroups: requests.athena.WorkgroupsResponse
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

  const [workgroup, setWorkgroup] = React.useState<requests.athena.Workgroup | null>(null)
  const handleWorkgroupChange = React.useCallback((w) => setWorkgroup(w), [setWorkgroup])
  return (
    <WorkgroupsFetcher>
      {({ handleWorkgroupsLoadMore, workgroupsData }) =>
        workgroupsData.case({
          Ok: (workgroups) => (
            <QueryResultsFetcher queryExecutionId={queryExecutionId}>
              {({ queryResultsData, handleQueryResultsLoadMore }) => {
                const queryExecution = (queryResultsData as requests.AsyncData<
                  requests.athena.QueryResultsResponse,
                  requests.athena.QueryExecution | null
                >).case({
                  _: () => null,
                  Ok: ({ queryExecution: qE }) => qE,
                })

                return (
                  <QueriesFetcher
                    workgroup={
                      workgroup?.name ||
                      queryExecution?.workgroup ||
                      workgroups?.defaultWorkgroup.name ||
                      ''
                    }
                  >
                    {({
                      queriesData,
                      executionsData,
                      handleQueriesLoadMore,
                      handleExecutionsLoadMore,
                    }) => (
                      <QueryRunner
                        queryBody={queryRequest || ''}
                        workgroup={
                          workgroup?.name || workgroups?.defaultWorkgroup.name || ''
                        }
                      >
                        {({ queryRunData }) =>
                          children({
                            customQueryBody,
                            executionsData,
                            handleExecutionsLoadMore,
                            handleQueriesLoadMore,
                            handleQueryBodyChange: setCustomQueryBody,
                            handleQueryMetaChange,
                            handleQueryResultsLoadMore,
                            handleSubmit,
                            handleWorkgroupChange,
                            handleWorkgroupsLoadMore,
                            queriesData,
                            queryMeta,
                            queryResultsData,
                            queryRunData,
                            workgroup:
                              workgroup ||
                              (queryExecution?.workgroup && {
                                key: queryExecution?.workgroup,
                                name: queryExecution?.workgroup,
                              }) ||
                              workgroups?.defaultWorkgroup,
                            workgroups,
                          })
                        }
                      </QueryRunner>
                    )}
                  </QueriesFetcher>
                )
              }}
            </QueryResultsFetcher>
          ),
          Err: makeAsyncDataErrorHandler('Workgroups Data'),
          _: makeAsyncDataPendingHandler(),
        })
      }
    </WorkgroupsFetcher>
  )
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

  const { urls } = NamedRoutes.use()

  return (
    <QueriesState queryExecutionId={queryExecutionId || null}>
      {({
        customQueryBody,
        executionsData,
        handleExecutionsLoadMore,
        handleQueriesLoadMore,
        handleQueryBodyChange,
        handleQueryMetaChange,
        handleQueryResultsLoadMore,
        handleSubmit,
        handleWorkgroupChange,
        handleWorkgroupsLoadMore,
        queriesData,
        queryMeta,
        queryResultsData,
        queryRunData,
        workgroup,
        workgroups,
      }) => (
        <div>
          <M.Typography variant="h6">Athena SQL</M.Typography>

          <div className={classes.selects}>
            <div className={classes.select}>
              <M.Typography className={classes.sectionHeader}>
                Select workgroup
              </M.Typography>

              {workgroups.list.length ? (
                <WorkgroupSelect
                  workgroups={workgroups}
                  onChange={handleWorkgroupChange}
                  onLoadMore={handleWorkgroupsLoadMore}
                  value={workgroup}
                />
              ) : (
                <M.FormHelperText>There are no workgroups.</M.FormHelperText>
              )}
            </div>

            <div className={classes.select}>
              {queriesData.case({
                Ok: (queries) =>
                  queries.list.length ? (
                    <>
                      <M.Typography className={classes.sectionHeader} variant="body1">
                        Select query
                      </M.Typography>

                      <QuerySelect
                        queries={queries.list}
                        onChange={handleQueryMetaChange}
                        value={customQueryBody ? null : queryMeta}
                        onLoadMore={
                          queries.next ? () => handleQueriesLoadMore(queries) : undefined
                        }
                      />
                    </>
                  ) : (
                    <M.Typography className={classes.emptySelect} variant="body1">
                      There are no saved queries.
                    </M.Typography>
                  ),
                Err: makeAsyncDataErrorHandler('Select query'),
                _: makeAsyncDataPendingHandler({ padding: 2 }),
              })}
            </div>
          </div>

          {queryResultsData.case({
            _: ({
              value: queryResults,
            }: {
              value: requests.athena.QueryResultsResponse
            }) => (
              <Form
                disabled={isButtonDisabled(
                  customQueryBody ||
                    queryResults?.queryExecution?.query ||
                    queryMeta?.body ||
                    '',
                  queryRunData,
                  null,
                )}
                onChange={handleQueryBodyChange}
                onSubmit={handleSubmit}
                value={
                  customQueryBody ||
                  queryResults?.queryExecution?.query ||
                  queryMeta?.body ||
                  ''
                }
              />
            ),
            Err: makeAsyncDataErrorHandler('Query Body'),
            Pending: makeAsyncDataPendingHandler({ size: 'large' }),
          })}

          {executionsData.case({
            Ok: (executions) => (
              <div>
                {queryExecutionId ? (
                  <M.Breadcrumbs className={classes.sectionHeader}>
                    <Link to={urls.bucketAthenaQueries(bucket)}>Query Executions</Link>
                    <M.Typography variant="body1" color="textPrimary">
                      Results for {queryExecutionId}
                    </M.Typography>
                  </M.Breadcrumbs>
                ) : (
                  <M.Typography className={classes.sectionHeader} color="textPrimary">
                    Query Executions
                  </M.Typography>
                )}

                {!queryExecutionId && (
                  <ExecutionsViewer
                    bucket={bucket}
                    executions={executions.list}
                    onLoadMore={
                      executions.next
                        ? () => handleExecutionsLoadMore(executions)
                        : undefined
                    }
                  />
                )}
              </div>
            ),
            Err: makeAsyncDataErrorHandler('Executions Data'),
            _: makeAsyncDataPendingHandler({ size: 'large' }),
          })}

          {queryResultsData.case({
            Init: () => null,
            Ok: (queryResults: requests.athena.QueryResultsResponse) => (
              <AthenaResults
                results={queryResults.list}
                onLoadMore={
                  queryResults.next
                    ? () => handleQueryResultsLoadMore(queryResults)
                    : undefined
                }
              />
            ),
            Err: makeAsyncDataErrorHandler('Query Results Data'),
            _: makeAsyncDataPendingHandler({ size: 'large' }),
          })}
        </div>
      )}
    </QueriesState>
  )
}
