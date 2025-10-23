import * as MUI from '../muiTreeShaking';

describe('MUI Tree Shaking', () => {
  it('should export core Material-UI components', () => {
    expect(MUI.Box).toBeDefined();
    expect(MUI.Typography).toBeDefined();
    expect(MUI.Button).toBeDefined();
    expect(MUI.TextField).toBeDefined();
    expect(MUI.Card).toBeDefined();
    expect(MUI.Dialog).toBeDefined();
    expect(MUI.FormControl).toBeDefined();
    expect(MUI.Select).toBeDefined();
    expect(MUI.Autocomplete).toBeDefined();
  });

  it('should export Material-UI icons', () => {
    expect(MUI.MenuIcon).toBeDefined();
    expect(MUI.CloseIcon).toBeDefined();
    expect(MUI.PersonIcon).toBeDefined();
    expect(MUI.HospitalIcon).toBeDefined();
    expect(MUI.CalendarIcon).toBeDefined();
    expect(MUI.AddIcon).toBeDefined();
    expect(MUI.EditIcon).toBeDefined();
    expect(MUI.DeleteIcon).toBeDefined();
  });

  it('should export date picker components', () => {
    expect(MUI.LocalizationProvider).toBeDefined();
    expect(MUI.DatePicker).toBeDefined();
    expect(MUI.TimePicker).toBeDefined();
    expect(MUI.DateTimePicker).toBeDefined();
    expect(MUI.AdapterDateFns).toBeDefined();
  });

  it('should export data grid components', () => {
    expect(MUI.DataGrid).toBeDefined();
    expect(MUI.GridColDef).toBeDefined();
    expect(MUI.GridRowsProp).toBeDefined();
    expect(MUI.GridToolbar).toBeDefined();
  });

  it('should export lab components', () => {
    expect(MUI.LoadingButton).toBeDefined();
    expect(MUI.TabList).toBeDefined();
    expect(MUI.TabContext).toBeDefined();
    expect(MUI.TabPanel).toBeDefined();
    expect(MUI.Masonry).toBeDefined();
  });

  it('should export system utilities', () => {
    expect(MUI.createTheme).toBeDefined();
    expect(MUI.createStyled).toBeDefined();
    expect(MUI.createBreakpoints).toBeDefined();
    expect(MUI.createSpacing).toBeDefined();
  });

  it('should not export unused components', () => {
    // These should not be exported to keep bundle size small
    expect(MUI).not.toHaveProperty('UnusedComponent');
    expect(MUI).not.toHaveProperty('HeavyComponent');
  });

  it('should have proper component structure', () => {
    // Test that components are properly structured
    expect(typeof MUI.Box).toBe('function');
    expect(typeof MUI.Typography).toBe('function');
    expect(typeof MUI.Button).toBe('function');
    expect(typeof MUI.TextField).toBe('function');
  });

  it('should export theme utilities', () => {
    expect(MUI.useTheme).toBeDefined();
    expect(MUI.styled).toBeDefined();
    expect(MUI.alpha).toBeDefined();
    expect(MUI.useMediaQuery).toBeDefined();
  });

  it('should export animation components', () => {
    expect(MUI.Fade).toBeDefined();
    expect(MUI.Grow).toBeDefined();
    expect(MUI.Slide).toBeDefined();
    expect(MUI.Zoom).toBeDefined();
    expect(MUI.Collapse).toBeDefined();
  });

  it('should export utility components', () => {
    expect(MUI.Backdrop).toBeDefined();
    expect(MUI.Modal).toBeDefined();
    expect(MUI.Popover).toBeDefined();
    expect(MUI.Popper).toBeDefined();
    expect(MUI.Portal).toBeDefined();
    expect(MUI.NoSsr).toBeDefined();
  });
});
