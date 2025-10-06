import { createTheme } from "@mui/material/styles";

const theme = createTheme({
  palette: {
    mode: "light",
    primary: {
      main: "#1976d2",
    },
    secondary: {
      main: "#2e7d32",
    },
    error: {
      main: "#d32f2f",
    },
    background: {
      default: "#f4f6f8",
      paper: "#fff",
    },
  },
  typography: {
    fontFamily: "Roboto, Arial, sans-serif",
    fontWeightRegular: 400,
    fontWeightMedium: 500,
  },
});

export default theme;