import PropTypes from 'prop-types'
import { useSelector } from 'react-redux'
import { useTheme } from '@mui/material/styles'
import { Checkbox, FormControl, InputLabel, ListItemText, MenuItem, Select } from '@mui/material'

/**
 * Standard multi-select filter for list/dashboard pages. Shares the outlined,
 * `size='small'`, `grey[900]+25` chrome of {@link FilterSelect} so single- and
 * multi-select filters look identical. An empty selection means "all".
 */
const MultiSelectFilter = ({ label, labelId, options, value, onChange }) => {
    const theme = useTheme()
    const customization = useSelector((state) => state.customization)
    const borderColor = theme.palette.grey[900] + 25

    return (
        <FormControl fullWidth size='small'>
            <InputLabel id={labelId} shrink>
                {label}
            </InputLabel>
            <Select
                labelId={labelId}
                multiple
                displayEmpty
                notched
                value={value}
                label={label}
                onChange={(e) => onChange(e.target.value)}
                size='small'
                renderValue={(selected) => (selected.length === 0 ? 'All' : `${selected.length} selected`)}
                sx={{
                    '& .MuiOutlinedInput-notchedOutline': { borderColor },
                    '& .MuiSvgIcon-root': { color: customization.isDarkMode ? '#fff' : 'inherit' },
                    // Softer value text so the "All" default reads like a placeholder
                    // (matching the Executions filters) instead of a heavy near-black value.
                    '& .MuiSelect-select': { color: theme.palette.text.secondary }
                }}
            >
                {options.map((opt) => (
                    <MenuItem key={opt.value} value={opt.value} sx={{ py: 0 }}>
                        <Checkbox size='small' checked={value.indexOf(opt.value) > -1} />
                        <ListItemText primaryTypographyProps={{ fontSize: 14 }} primary={opt.label} />
                    </MenuItem>
                ))}
            </Select>
        </FormControl>
    )
}

MultiSelectFilter.propTypes = {
    label: PropTypes.string,
    labelId: PropTypes.string,
    options: PropTypes.array,
    value: PropTypes.array,
    onChange: PropTypes.func
}

export default MultiSelectFilter
