import React from "react";
import TextBox from './textbox';
import Grid from '@mui/material/Grid';
import Box from '@mui/material/Box';

const TextPage = () => {
  return (
    <div>
      <h1></h1>
      <Box sx={{ width: '100%'}}> 
      <Grid Container>
        <Grid item >
      <TextBox 
      />
      </Grid>
      </Grid>
     </Box>
      <p></p>
    </div>
  );
};

export default TextPage;