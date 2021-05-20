import * as React from 'react'
import * as M from '@material-ui/core'
import * as Lab from '@material-ui/lab'

import Code from 'components/Code'
import * as packageHandleUtils from 'utils/packageHandle'

const useStyles = M.makeStyles((t) => ({
  lock: {
    alignItems: 'center',
    background: 'rgba(255,255,255,0.7)',
    border: `1px solid ${t.palette.action.disabled}`,
    borderRadius: t.shape.borderRadius,
    bottom: 0,
    cursor: 'not-allowed',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  progressContainer: {
    display: 'flex',
    position: 'relative',
  },
}))

interface PackageRemoveDialogProps {
  error?: Error
  loading: boolean
  onClose: () => void
  onRemove: (handle: packageHandleUtils.PackageHandle) => void
  open: boolean
  packageHandle: packageHandleUtils.PackageHandle
}

export default function PackageRemoveDialog({
  error,
  loading,
  onClose,
  onRemove,
  open,
  packageHandle,
}: PackageRemoveDialogProps) {
  const classes = useStyles()

  const handleRemove = React.useCallback(() => {
    onRemove(packageHandle)
  }, [packageHandle, onRemove])

  const handleClose = React.useCallback(() => {
    if (!loading) onClose()
  }, [loading, onClose])

  return (
    <M.Dialog
      aria-labelledby="alert-dialog-title"
      aria-describedby="alert-dialog-description"
      open={open}
      onClose={handleClose}
    >
      <M.DialogTitle id="alert-dialog-title">Confirm deletion</M.DialogTitle>
      <M.DialogContent id="alert-dialog-description">
        <M.DialogContentText>
          You are about to delete{' '}
          <Code>{packageHandleUtils.shortenRevision(packageHandle.revision)}</Code>{' '}
          revison of <Code>{packageHandle.name}</Code> package.
        </M.DialogContentText>
        <M.DialogContentText>
          This action is non-reversible! Are you sure?
        </M.DialogContentText>

        {error && <Lab.Alert severity="error">{error.message}</Lab.Alert>}
      </M.DialogContent>

      <M.DialogActions>
        <M.Button onClick={handleClose} color="primary" autoFocus disabled={loading}>
          Cancel
        </M.Button>
        <M.Button onClick={handleRemove} color="primary" disabled={loading}>
          Yes, delete
        </M.Button>
      </M.DialogActions>

      {loading && (
        <div className={classes.lock}>
          <div className={classes.progressContainer}>
            <M.CircularProgress size={80} variant="indeterminate" />
          </div>
        </div>
      )}
    </M.Dialog>
  )
}
