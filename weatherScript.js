const timeElement = document.getElementById("time");
const dateElement = document.getElementById("date");
const infoElement = document.getElementById("info");
const dayDataElement = document.getElementById("dayData");
const weekDayElement = document.getElementById("weekDay");

let currentDay;
let lastValidCity;

let cityLat;
let cityLon;

let chart;

//const loadingBackground = "url("/~dolj14/WeatherApp/icons/mist.jpeg)";
const loadingBackground = "url(./icons/mist.jpeg)";

const alertString = "Počasí pro toto město nenalezeno!";


const days = ["Neděle", "Pondělí", "Úterý", "Středa", "Čtvrtek", "Pátek", "Sobota"];
const months = ["Leden", "Únor", "Březen", "Duben", "Květen", "Červen", "Červenec", "Srpen", "Září", "Říjen", "Listopad", "Prosinec"];

const APIKEY = "eb2ae4fa5ad552196600a6b55ffdbc0e";

showLoading();
let hidden = true;


if (!(window.location.search.includes("city") || window.location.search.includes("City"))){
    getCity();
}


setInterval(() => {
    const time = new Date();
    const month = time.getMonth();
    const date = time.getDate();
    const day = time.getDay();
    const hour = time.getHours();
    const minutes = time.getMinutes() < 10 ? "0" + time.getMinutes() : time.getMinutes();

    currentDay = day;

    timeElement.innerHTML = hour + ":" + minutes;
    dateElement.innerHTML = months[month] + ", " + date;
    weekDayElement.innerHTML = days[parseInt(currentDay)];

    //at the initial load, everything is hidden in order not to see the original html
    if (hidden) {
        hideLoading();
        hidden = false;
    }
    if(window.location.search.includes("?display=days")){
        showDays();
    }else if(window.location.search.includes("?display=hours")){
        showHours();
    }
}, 1000);

getCityFromParams();

function getWeather(city){
    //getting data from API. then setting them into json
    fetch(
        "https://api.openweathermap.org/data/2.5/weather?q="
        +city
        +"&units=metric&appid="
        +APIKEY
    )
        .then((response) => {
            if (!response.ok) {
                alert(alertString)
                document.querySelector(".searchBar").value = lastValidCity;
                throw new Error("not found");
            }
            lastValidCity = city;
            //let url = "/~dolj14/WeatherApp/weatherApp.html?city=" + lastValidCity;
            if(!(window.location.search.includes("?display=hours"))){
                //let url = "/~dolj14/WeatherApp/weatherApp.html?city=" + lastValidCity + "&?display=days";
                let url = "/WeatherApp/weatherApp.html" + "?city=" + lastValidCity + "&?display=days";
                history.pushState(lastValidCity, null, url)
            }
            return response.json();
        })
        .then((data) => displayData(data));
}
function displayData(data) {
    //retrieving data from json
    const {name} = data;
    const {icon, description} = data.weather[0];
    const {temp, humidity} = data.main;
    const {lat, lon} = data.coord;
    cityLat = lat;
    cityLon = lon;
    if(chart!=null){
        chart.destroy();
    }
    chart = displayGraph(getHourlyData());
    const {sunrise, sunset} = data.sys;
    const {timezone} = data;
    const {speed} = data.wind;
    //document.getElementById("city").style.visibility = "visible";
    document.getElementById("city").innerText = name;

    //icon setting
    document.getElementById("mainWeatherIcon").src = "http://openweathermap.org/img/wn/" + icon + "@2x.png";

    document.querySelector(".todayTemperature").innerText = Math.round(temp*10)/10 + "°C";
    document.querySelector(".description").innerText = description;
    document.getElementById("humidityValue").innerText = humidity + " %";
    document.querySelector(".windSpeed div:nth-child(2)").innerText = speed + " m/s";

    // Sunset and sunrise is in unix format, moment lib transfers it into readable fomrat
    document.querySelector(".sunRise div:nth-child(2)").innerText = window.moment((sunrise + timezone - 3600) *1000).format('HH:mm');
    document.querySelector(".sunSet div:nth-child(2)").innerText = window.moment((sunset + timezone - 3600)*1000).format('HH:mm');

   //background setting, if the city does not have any Photo, background is set to a picture of the description of weather
    if(checkBackground("https://source.unsplash.com/1600x900/?" + name)){
        let background = "url('https://source.unsplash.com/1600x900/?" + name + "')";
        document.body.style.backgroundImage = background;
    }else{
        let background = "url('https://source.unsplash.com/1600x900/?" + description + "')";
        document.body.style.backgroundImage = background;
    }
    //displaying another days data
    displayAnotherDaysData(lat, lon)

    if (hidden) {
        hideLoading();
        hidden = false;
    }
}
function displayAnotherDaysData(lat, lon){
    fetch('https://api.openweathermap.org/data/2.5/onecall?lat=' +
    lat + '&lon=' + lon + '&exclude={part}&appid='+APIKEY)
        .then((response) => response.json())
        .then((data) => setDaysData(data.daily, data.timezone_offset))
}
function setDaysData(data, timezone){
    for(let i = 1; i <= (data.length) - 1; i++){
        let anotherDay = currentDay;
        let dayPosition = anotherDay + i;

        //day position has to be smaller than 6 ( days indexes)
        while(dayPosition > 6){
            dayPosition = dayPosition - 7;
        }
        // without parsing to int, it makes a mess sometimes
        let dayName = (days[parseInt(dayPosition)]);
        let {day, night} = data[i].temp;
        let {sunset} = data[i];
        sunset = window.moment((sunset + timezone - 3600) * 1000).format("HH:mm");
        let {icon} = data[i].weather[0];
        day = Math.round((day - 273.15)*10)/10;
        night = Math.round((night - 273.15)*10)/10;
        let searchingString = ".otherDays .otherDay:nth-child(" + (i) + ")";
        document.querySelector(searchingString).innerHTML = "<img src=\"https://openweathermap.org/img/wn/" + icon + "@2x.png\" alt=\"weatherIcon\" class=\"weatherIcon\">\n" +
            "            <div class=\"dayName\">"+dayName+"</div>\n" +
            "            <div class=\"temp\">Den: " + day + "°C</div>\n" +
            "            <div class=\"temp\">Noc:  " + night + "°C</div>\n" +
            "            <div class=\"zapad\">Západ slunce: " + sunset + "</div>\n" +
            "        </div>"
    }
}

function checkBackground(url){
    let http = new XMLHttpRequest();
    http.open("GET", url, false);
    http.send(null)
    if(http.responseText.includes("404 Not Found") || http.responseURL.includes("source-404")){
        return false;
    }else {
        return true;
    }
}

//function which retrieves data from search bar
function search(){
    getWeather(document.getElementById("searchBar").value);
    showLoading();
    hidden = true;
}
document.querySelector(".searchBar").addEventListener("keypress", function (e){
    if(e.key == "Enter"){
        if(document.querySelector(".searchBar").value == ""){
            getCity();
        }else {
            search();
        }
        showLoading();
        hidden = true;
    }
});

document.querySelector(".searchButton").addEventListener("click", function(){
    if(document.querySelector(".searchBar").value == ""){
        getCity();
    }else{
        search();
    }
});

//getting city from the geolocation data
function getCity(){
    let startingCity;
    navigator.geolocation.getCurrentPosition((success) => {
            let {latitude, longitude} = success.coords;
            const locationApi = ('https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en');
            fetch(locationApi)
                .then(result => result.json())
                .then(data => {
                    const {city} = data;
                    document.getElementById("searchBar").value = city;
                    getWeather(city);
                })
    }, (fail) => {
        //if the geolocation is not allowed, default city is going to be Prague
        startingCity = 'Prague';
        document.getElementById("searchBar").value = startingCity;

        getWeather(startingCity);
    })
}

//retrieving city from parameters, it enables working with browsing history
function getCityFromParams(){
    let string = window.location.search;
    let urlParams = new URLSearchParams(string);
    let city = urlParams.get('city');
    if (!(city == null)){
        fetch(
            "https://api.openweathermap.org/data/2.5/weather?q="
            +city
            +"&units=metric&appid="
            +APIKEY
        ).then((response) => {
            if (!response.ok) {
                alert("Zadany parametr neodkazuje na mesto")
                getCity();
                return;
            }
            document.getElementById("searchBar").value = city;
            getWeather(city);
        });
    }else{
        getCity();
    }
}

//reloading the page when the window back button is clicked
window.addEventListener('popstate', function (){
    window.location.reload();
});

//hides elements and shows loading process
function showLoading(){
    document.querySelector(".day").style.display = "none";
    document.querySelector(".otherDays").style.display = "none";
    document.querySelector("#loading").style.display = "block";
    document.body.style.backgroundImage  = loadingBackground;
}

//hides loading process and shows elements
function hideLoading(){
    document.querySelector(".day").style.display = "flex";
    document.querySelector(".otherDays").style.display = "flex";
    document.querySelector("#loading").style.display = "none";
}

//hides day data and show chart with hours
function showHours(){
    document.querySelector(".day").style.display = "none";
    document.querySelector(".otherDays").style.display = "none";
    document.querySelector(".chartGrid").style.display = "grid";
}

//button for changing to mode to hour mode
document.querySelector(".chartButton").addEventListener("click", function (){
    //let url = "/~dolj14/WeatherApp/weatherApp.html?city=" + lastValidCity + "&?display=hours";
    let url = "/WeatherApp/weatherApp.html" + "?city=" + lastValidCity + "&?display=hours";
    history.pushState(lastValidCity, null, url)
    showHours();
});

//hides hours and shows day data
function showDays(){
    document.querySelector(".day").style.display = "flex";
    document.querySelector(".otherDays").style.display = "flex";
    document.querySelector(".chartGrid").style.display = "none";
}

//button for getting bac to daily data
document.querySelector(".dayButton").addEventListener("click", function (){
    //let url = "/~dolj14/WeatherApp/weatherApp.html?city=" + lastValidCity + "&?display=days";
    let url = "/WeatherApp/weatherApp.html" + "?city=" + lastValidCity + "&?display=days";
    history.pushState(lastValidCity, null, url)
    showDays();
});

//retrieving hourly data from the api
function getHourlyData(){
    //using an array of arrays to store the data for chart
    let realTemp = []
    let feelsTemp = []
    let time = []
    let hoursData = [time, realTemp, feelsTemp];
    let api = 'https://api.openweathermap.org/data/2.5/onecall?lat=' +
        cityLat + '&lon=' + cityLon + '&exclude={part}&appid='+APIKEY
    fetch(api
    )
        .then((response) => {
            return response.json();
        })
        .then((data) => {
            let {timezone_offset} = data;

            // cycle for whole 48 hours
                // data.hourly.forEach(entry =>{
                //     let time = window.moment((entry.dt + timezone_offset - 3600) *1000).format('HH:mm');
                //     hoursData[0].push(time);
                //     hoursData[1].push(entry.temp - 273.15);
                //     hoursData[2].push(entry.feels_like - 273.15);
                // });

            //for cycle for only 25 hours
            for(let i = 0; i <= 24; i++){
                let time = window.moment((data.hourly[i].dt + timezone_offset - 3600) *1000).format('HH:mm');
                hoursData[0].push(time);
                hoursData[1].push(data.hourly[i].temp - 273.15);
                hoursData[2].push(data.hourly[i].feels_like - 273.15);
            }
        })
    return hoursData;
}

//displaying hour data using the chart from chart.js lib
function displayGraph(data){
    const ctx = document.getElementById("chartCanvas").getContext("2d");

    const labels = data[0];
    const dataForGraph = {
        labels: labels,
        datasets: [{
            label: 'Reálná teplota',
            data: data[1],
            fill: true,
            borderColor: 'rgb(0,0,0)',
            backgroundColor: 'rgba(244,248,248,0)',
        },{
            label: 'Pocitová teplota',
            data: data[2],
            fill: true,
            borderColor: 'rgb(8,42,231)',
            backgroundColor: 'rgba(244,248,248,0)',
        }]
    };
    const config = {
        type: 'line',
        data: dataForGraph,
        options:
            {
                scales: {
                    y: {
                        max: data[1].max,
                        min: data[1].min,
                        ticks: {
                            callback: function (value){
                                return value + "°C"
                            },
                        },
                    },
                    x:{
                        min: data[0].min,
                        max: data[0].max,
                    }
                },
                responsive: true,
                hover: {
                    mode: 'index',
                    intersect: true,
                },
            }
    };
    return new Chart(ctx, config);
}
