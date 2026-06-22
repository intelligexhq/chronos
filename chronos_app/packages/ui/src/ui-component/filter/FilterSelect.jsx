import PropTypes from 'prop-types'
import { useSelector } from 'react-redux'
import { useTheme } from '@mui/material/styles'
import { FormControl, InputLabel, MenuItem, Select } from '@mui/material'

/**
 * Standard single-select filter for list/dashboard pages: outlined, `size='small'`,
 * `grey[900]+25` border, dark-mode-aware caret — the chrome used on the
 * Executions and Audit Log filter bars, factored out so new pages share one
 * source of truth instead of re-deriving the `sx` inline.
 */
const FilterSelect = ({ label, labelId, value, onChange, options }) => {
    const theme = useTheme()
    const customization = useSelector((state) => state.customization)
    const borderColor = theme.palette.grey[900] + 25

    return (
        <FormControl fullWidth size='small'>
            <InputLabel id={labelId}>{label}</InputLabel>
            <Select
                labelId={labelId}
                value={value}
                label={label}
                onChange={(e) => onChange(e.target.value)}
                size='small'
                sx={{
                    '& .MuiOutlinedInput-notchedOutline': { borderColor },
                    '& .MuiSvgIcon-root': { color: customization.isDarkMode ? '#fff' : 'inherit' },
                    // Softer value text so a populated default reads like the
                    // Executions filters rather than a heavy near-black value.
                    '& .MuiSelect-select': { color: theme.palette.text.secondary }
                }}
            >
                {options.map((opt) => (
                    <MenuItem key={opt.value} value={opt.value}>
                        {opt.label}
                    </MenuItem>
                ))}
            </Select>
        </FormControl>
    )
}

FilterSelect.propTypes = {
    label: PropTypes.string,
    labelId: PropTypes.string,
    value: PropTypes.any,
    onChange: PropTypes.func,
    options: PropTypes.array
}

export default FilterSelect
