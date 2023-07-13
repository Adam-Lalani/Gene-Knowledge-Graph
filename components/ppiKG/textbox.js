import React, { useState } from 'react';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';

const TextBox = () => {
    const [text, setText] = useState(''); // State to store the text input value
    const [response, setResponse] = useState(''); // State to store the processed text

    const handleTextChange = (event) => {
      setText(event.target.value); // Update the text state with the new input value
    };

    const processText = async () => {
        // Process the text here, e.g., perform some operations or validations
        
        try{
            const processed = text.toUpperCase().split(" ")
            const payload = {'genset' : processed}
            //setResponse(payload); // Update the processed text state

            const url =  "http://localhost:3000/G2Ntest/api/knowledge_graph/ppi_kg"
            const response = await fetch(url, {
                method: 'POST', // Change to the appropriate HTTP method (GET, POST, etc.)
                headers: {
                    'Content-Type': 'application/json', // Set the appropriate content type
                },
                body: payload //JSON.stringify({ text }), // Send the text input as the request body
              });
              const data = await response.json();
              setResponse("cat"); // Store the HTTP response in the state
        } catch (error) {
          console.error(error);
      }
    };
  
    return (
       <div>
      <TextField
        label="Enter Text"
        value={text}
        onChange={handleTextChange}
        fullWidth
      />
      <Button variant="contained" onClick={processText}>
        Process
      </Button>
      {response && (
        <div>
          <p>HTTP Response:</p>
          <pre>{JSON.stringify(response)}</pre>
        </div>
      )}
    </div>
  );
};


export default TextBox;