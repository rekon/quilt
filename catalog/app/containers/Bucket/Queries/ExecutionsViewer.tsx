import cx from 'classnames'
import * as dateFns from 'date-fns'
import * as React from 'react'
import * as M from '@material-ui/core'
import * as Lab from '@material-ui/lab'

import * as NamedRoutes from 'utils/NamedRoutes'
import Link from 'utils/StyledLink'

import * as requests from './requests'

const useExecutionStyles = M.makeStyles((t) => ({
  date: {
    whiteSpace: 'nowrap',
  },
  cell: {
    width: '40%',
    '& + &': {
      width: 'auto',
      textAlign: 'right',
    },
  },
  expandedCell: {
    paddingBottom: 0,
    paddingTop: 0,
  },
  expandedQuery: {
    maxHeight: t.spacing(30),
    maxWidth: '100%',
    overflow: 'auto',
    padding: t.spacing(1),
  },
}))

interface ExecutionProps {
  bucket: string
  queryExecution: requests.athena.QueryExecution
}

function Execution({ bucket, queryExecution }: ExecutionProps) {
  const classes = useExecutionStyles()

  const { urls } = NamedRoutes.use()

  const [expanded, setExpanded] = React.useState(false)

  const onToggle = React.useCallback(() => setExpanded(!expanded), [expanded])
  const trimmedQuery = React.useMemo(
    () =>
      !queryExecution.query || queryExecution.query.length <= 30
        ? queryExecution.query
        : `${queryExecution.query?.substring(0, 30)} … ${queryExecution.query?.substr(
            -20,
          )}`,
    [queryExecution],
  )

  const completed = queryExecution.completed
    ? dateFns.format(queryExecution.completed, 'MMM do, HH:mm:ss')
    : null

  return (
    <>
      <M.TableRow>
        <M.TableCell className={classes.cell} onClick={onToggle}>
          {trimmedQuery}
        </M.TableCell>
        <M.TableCell className={classes.cell}>
          <abbr title={queryExecution.id}>{queryExecution.status}</abbr>
        </M.TableCell>
        <M.TableCell className={cx(classes.cell, classes.date)}>
          {queryExecution.created
            ? dateFns.format(queryExecution.created, 'MMM do, HH:mm:ss')
            : null}
        </M.TableCell>
        <M.TableCell className={cx(classes.cell, classes.date)}>
          {queryExecution.status === 'SUCCEEDED' ? (
            <Link to={urls.bucketAthenaQueryExecution(bucket, queryExecution.id)}>
              {completed}
            </Link>
          ) : (
            completed
          )}
        </M.TableCell>
      </M.TableRow>
      <M.TableRow>
        <M.TableCell colSpan={4} className={classes.expandedCell}>
          <M.Collapse in={expanded}>
            <pre className={classes.expandedQuery}>{queryExecution.query}</pre>
          </M.Collapse>
        </M.TableCell>
      </M.TableRow>
    </>
  )
}

const useStyles = M.makeStyles((t) => ({
  cell: {
    width: '40%',
    '& + &': {
      width: 'auto',
      textAlign: 'right',
    },
  },
  footer: {
    display: 'flex',
    padding: t.spacing(1),
  },
  more: {
    marginLeft: 'auto',
  },
  table: {
    tableLayout: 'fixed',
  },
}))

interface ExecutionsViewerProps {
  bucket: string
  className?: string
  executions: requests.athena.QueryExecution[]
  onLoadMore?: () => void
}

export default function ExecutionsViewer({
  bucket,
  className,
  executions,
  onLoadMore,
}: ExecutionsViewerProps) {
  const classes = useStyles()

  const pageSize = 10
  const [page, setPage] = React.useState(1)

  const handlePagination = React.useCallback(
    (event, value) => {
      setPage(value)
    },
    [setPage],
  )

  const rowsPaginated = executions.slice(pageSize * (page - 1), pageSize * page)
  const hasPagination = executions.length > rowsPaginated.length

  return (
    <M.TableContainer component={M.Paper} className={className}>
      <M.Table size="small" className={classes.table}>
        <M.TableHead>
          <M.TableRow>
            <M.TableCell className={classes.cell}>Query</M.TableCell>
            <M.TableCell className={classes.cell}>Status</M.TableCell>
            <M.TableCell className={classes.cell}>Date created</M.TableCell>
            <M.TableCell className={classes.cell}>Date completed</M.TableCell>
          </M.TableRow>
        </M.TableHead>
        <M.TableBody>
          {rowsPaginated.map((queryExecution) => (
            <Execution
              bucket={bucket}
              queryExecution={queryExecution}
              key={queryExecution.id}
            />
          ))}
          {!executions.length && (
            <M.TableRow>
              <M.TableCell colSpan={4}>
                <M.Box p={3} textAlign="center">
                  <M.Typography variant="h6">
                    No executions for this workgroup
                  </M.Typography>
                  <M.Typography>
                    Select another workgroup or execute some query
                  </M.Typography>
                </M.Box>
              </M.TableCell>
            </M.TableRow>
          )}
        </M.TableBody>
      </M.Table>

      {(hasPagination || !!onLoadMore) && (
        <div className={classes.footer}>
          {hasPagination && (
            <Lab.Pagination
              count={Math.ceil(executions.length / pageSize)}
              page={page}
              size="small"
              onChange={handlePagination}
            />
          )}
          {onLoadMore && (
            <M.Button className={classes.more} size="small" onClick={onLoadMore}>
              Load more
            </M.Button>
          )}
        </div>
      )}
    </M.TableContainer>
  )
}
