import * as React from 'react'
import * as M from '@material-ui/core'
import * as Lab from '@material-ui/lab'

import * as requests from './requests'

interface QuerySelectProps {
  loading: boolean
  onChange: (value: string) => void
  queries: requests.Query[]
  value: string
}

function QuerySelectSkeleton() {
  const t = M.useTheme()
  return <Lab.Skeleton height={t.spacing(4)} width="100%" />
}

export default function QuerySelect({
  loading,
  onChange,
  queries,
  value,
}: QuerySelectProps) {
  const handleChange = React.useCallback(
    (event) => {
      onChange(event.target.value.toString())
    },
    [onChange],
  )

  if (loading) {
    return <QuerySelectSkeleton />
  }

  return (
    <M.FormControl>
      <M.Select value={value} onChange={handleChange}>
        {queries.map((query) => (
          <M.MenuItem key={query.key} value={query.key}>
            {query.name}
          </M.MenuItem>
        ))}
      </M.Select>
    </M.FormControl>
  )
}