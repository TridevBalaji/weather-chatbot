import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { convertToCoreMessages, generateText, streamText } from "ai";
import { createConnection } from "mysql2/promise";
import { z } from "zod";
import axios from "axios"; // Install axios for making HTTP requests
//import "./global.js";
const google = createGoogleGenerativeAI({ apiKey: "AIzaSyA6wQcWglcK3oZ-X4v_GUbVVZpmQnhZIKg" });

// Define the schema for weather data
const weather_schema = z.object({
    City_Name: z.string(),
    Temperature: z.number(),
    Weather_Condition: z.string(),
});

// Function to extract JSON from response text
const extractJson = (responseText) => {
    const jsonString = responseText.replace(/```json\n|\n```/g, "").trim();
    return JSON.parse(jsonString);
};

// Function to fetch weather data from API
const fetchWeatherData = async(cityName) => {
    const apiKey = "47ea628edff553ec908265147ca0310b"; // Replace with your actual API key
    const url = `https://api.openweathermap.org/data/2.5/weather?q=${cityName}&appid=${apiKey}&units=metric`;

    try {
        const response = await axios.get(url);
        const { main, weather } = response.data;
        return {
            City_Name: cityName,
            Temperature: main.temp,
            Weather_Condition: weather[0].description,
        };
    } catch (error) {
        console.error("Error fetching weather data:", error);
        throw new Error("Could not fetch weather data");
    }
};

// Function to generate SQL query based on user input
const generate_query = async(inp) => {
    const system_prompt = JSON.stringify({
        database_structure: "CREATE TABLE Weather (City_Name VARCHAR(100), Temperature FLOAT, Weather_Condition VARCHAR(100));",
        persona: "You are a SQL query-generating assistant for the Weather Chatbot.",
        instructions: "Your task is to generate appropriate SQL queries for the weather database based on user requirements.",
        output: "{ message: 'response.text', query: 'sql-query' }"
    });

    const response = await generateText({
        model: google("gemini-1.5-flash"),
        prompt: inp,
        maxSteps: 5,
        system: system_prompt,
    });

    const query_ = extractJson(response.text).query;
    console.log("Generated SQL Query:", query_); // Log the generated query
    return query_;
};

// Function to update the weather data in the database
const updateWeatherData = async(weatherData) => {
    const connection = await createConnection({
        host: "localhost",
        user: "root",
        database: "weather_info",
        password: "Mysql@12", // Use environment variable for security
    });

    const sqlQuery = `
        INSERT INTO Weather (City_Name, Temperature, Weather_Condition)
        VALUES (?, ?, ?)
        ON DUPLICATE KEY UPDATE
            Temperature = VALUES(Temperature),
            Weather_Condition = VALUES(Weather_Condition);
    `;

    try {
        await connection.execute(sqlQuery, [
            weatherData.City_Name,
            weatherData.Temperature,
            weatherData.Weather_Condition,
        ]);
        console.log("Weather data updated for", weatherData.City_Name);
    } catch (error) {
        console.error("Error updating weather data:", error);
        throw new Error("Could not update weather data");
    } finally {
        await connection.end();
    }
};

// Access the weather database and execute the query
const access_db = async(message) => {
    const connection = await createConnection({
        host: "localhost",
        user: "root",
        database: "weather_info",
        password: "Mysql@12", // Use environment variable for security
    });

    // Generate a SQL query to retrieve weather data based on user input
    const sqlQuery = await generate_query(message);

    if (!sqlQuery || sqlQuery.trim() === "") {
        console.error("Error: Generated SQL query is empty.");
        return { success: false, error: "Generated SQL query is empty." };
    }

    let result;
    try {
        result = await connection.execute(sqlQuery);
    } catch (error) {
        console.error("Error executing SQL query:", error);
        return { success: false, error: error.message };
    } finally {
        await connection.end();
    }

    return { success: true, result: result[0] }; // Return only the rows from the result
};

// Handle POST requests
export async function POST(req) {
    const { messages, selectedOption } = await req.json();

    const modelMap = {
        "gemini-1.5-pro-latest": "gemini-1.5-pro-latest",
        "gemini-1.5-pro": "gemini-1.5-pro",
        "gemini-1.5-flash": "gemini-1.5-flash",
        "gemini-1.0-pro": "gemini-1.0-pro",
    };

    const model_ = google(modelMap[selectedOption] || "gemini-1.5-flash");

    const text = await streamText({
        model: model_,
        messages: convertToCoreMessages(messages),
        maxSteps: 4,
        system: JSON.stringify({
            persona: "You are a chatbot designed to provide accurate weather information and forecasts.",
            objective: "You should only respond to queries related to weather and assist the users.",
            instructions: [
                "1. If the user requests weather for a city, check if you have the latest data.",
                "2. If not, update the weather data using the update_weather tool.",
                "3. Respond with the latest weather information.",
            ],
            examples: [{
                    user: "Hi, what's the weather in New York?",
                    assistant: "The weather in New York is currently sunny with a temperature of 22°C.",
                },
                {
                    user: "Can you tell me about the weather in Los Angeles?",
                    assistant: "Sure! In Los Angeles, it's partly cloudy with a temperature of 28.2°C.",
                },
                {
                    user: "What's the forecast for the next week in New York?",
                    assistant: "I'm sorry, I don't have access to forecasts. Please check a reliable weather service for more details.",
                },
            ],
        }),
        tools: {
            update_weather: {
                description: "Update the weather data for a specific city.",
                parameters: z.object({
                    cityName: z.string(),
                }),
                execute: async({ cityName }) => {
                    console.log("User requested weather update for:", cityName);
                    try {
                        const weatherData = await fetchWeatherData(cityName);
                        await updateWeatherData(weatherData);
                        return { success: true, result: weatherData };
                    } catch (error) {
                        console.error("Error updating weather:", error);
                        return { success: false, error: error.message };
                    }
                },
            },
            access_db: {
                description: "Search for the required weather data in the SQL database.",
                parameters: z.object({
                    message: z.string(),
                }),
                execute: async({ message }) => {
                    console.log("User message for database access:", message);
                    try {
                        const result = await access_db(message);
                        console.log("Database result:", result);
                        return { success: true, result };
                    } catch (error) {
                        console.error("Error in accessing Database:", error);
                        return { success: false, error: error.message };
                    }
                },
            },
        },
    });

    return text.toDataStreamResponse();
}