# ESP_Keyboard
My bluethoot keyboard



# install
1. get the arduino ide
2. add the esp32 boards manager
3. add the libraries
4. fill in your wifi credentials
5. flash your esp with this tool
6. in your terminal do """npx create-react-app esp32-controller"""
7. add the .jsx file
8. paste this in your app.js 
""" javascript
  import ESP32KeyboardController from "./ESP32KeyboardController";

function App() {
  return <ESP32KeyboardController />;
}

export default App;
"""

9. go to terminal and type npm start
10. from there you can type

