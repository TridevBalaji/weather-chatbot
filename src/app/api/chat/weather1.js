const axios = require('axios');
const mysql = require('mysql2');
const readline = require('readline');

// OpenWeatherMap API credentials
const API_KEY = '47ea628edff553ec908265147ca0310b';

// Function to fetch weather data from OpenWeatherMap and update or insert into MySQL
async function updateWeatherData(city) {
    let connection;

    try {
        // OpenWeatherMap API URL
        const weatherUrl = `http://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${API_KEY}&units=metric`;

        // Fetch the weather data from OpenWeatherMap API
        const response = await axios.get(weatherUrl);
        const data = response.data;

        const temperature = data.main.temp;
        const weatherCondition = data.weather[0].description; // Get the weather condition

        console.log(`Current temperature in ${city} is ${temperature}°C with ${weatherCondition}`);

        // MySQL connection details
        connection = mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: 'Mysql@12',
            database: 'weather_info'
        });

        connection.connect();

        // Check if the city already exists in the database
        const [results] = await connection.promise().query('SELECT * FROM weather WHERE city_name = ?', [city]);

        if (results.length > 0) {
            // If city exists, update the temperature and weather condition
            const updateQuery = 'UPDATE weather SET temperature = ?, weather_condition = ? WHERE city_name = ?';
            const [updateResult] = await connection.promise().execute(updateQuery, [temperature, weatherCondition, city]);
            console.log(`${updateResult.affectedRows} record(s) updated for city ${city}.`);
        } else {
            // If city doesn't exist, insert the city name, temperature, and weather condition
            const insertQuery = 'INSERT INTO weather (city_name, temperature, weather_condition) VALUES (?, ?, ?)';
            const [insertResult] = await connection.promise().execute(insertQuery, [city, temperature, weatherCondition]);
            console.log(`City ${city} added to the database with temperature ${temperature}°C and weather condition ${weatherCondition}.`);
        }
    } catch (error) {
        if (error.response) {
            console.log(`Error fetching weather data: ${error.response.data}`);
        } else if (error.code) {
            console.log(`Error with MySQL: ${error.message}`);
        } else {
            console.log(`Unexpected error: ${error.message}`);
        }
    } finally {
        // Ensure the connection is closed
        if (connection) {
            connection.end();
        }
    }
}

// Function to ask user for city name
function askForCity() {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    rl.question('Please enter the city name: ', (city) => {
        updateWeatherData(city);
        rl.close();
    });
}

// Start the program by asking for a city name
askForCity();