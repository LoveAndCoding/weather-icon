'use latest';

// Dependencies
const express    = require('express');
const Webtask    = require('webtask-tools');
const bodyParser = require('body-parser');
const Bluebird   = require('bluebird');
const Request    = Bluebird.promisifyAll(require('request'));
const proxyaddr  = require('proxy-addr');

// Constants
const IP_LOOKUP_BASE_URL      = 'http://ip-api.com/json/'; // HTTPS Not Available
const WEATHER_LOOKUP_BASE_URL = 'https://api.darksky.net/forecast/';

// SVG Constants at the end for size/readability reasons

// App
const app = express();

app.use(bodyParser.json());

app.get('/', (req, res, next) => {
	getLocation (req)
		.spread(getWeather.bind(null, req))
		.then((weatherData) => {
			res.setHeader('Content-Type', 'image/svg+xml');
			res.send(getIcon(weatherData));
		})
		.catch(next);
});

module.exports = Webtask.fromExpress(app);

/** requestJSON
 * 
 * Perform a request that is expected to return JSON in the body
 * 
 * @param {String} url - URL to request the JSON from
 * @return {Promise<Object>} Promise resolves with the parsed JSON object
 **/
function requestJSON(url) {
	return Request.getAsync(url)
		.get(1)
		.then(JSON.parse);
}

/** getLocation
 * 
 * Get the lat/long for the current requests IP. If no IP is available,
 * we will default to an IP address owned by the City of Seattle to give
 * us a reasonable default. This applies for me because I am in Seattle,
 * but won't always. Ideally Webtask would support remote IPs.
 * 
 * Utilizes ip-api.com for the lookup request for IP addresses
 * 
 * @param {Request} req - The current request being processed
 * @return {Promise<Array>} Resolves with an array of [latitude, longitude]
 *  based on requesting user's IP or our Seattle fallback. Use of the
 *  `spread()` function in bluebird is recommended
 * 
 **/
function getLocation (req) {
	let ip = proxyaddr.all(req, 'uniquelocal');
	ip = ip[ip.length - 1];
	
	if(!ip) {
		// I believe we will always hit this for now. Remote Address doesn't seem to be available atm
		//
		// We're just going to use a "default" IP address here
		// This is an IP owned by the City of Seattle. Probably stable enough
		ip = '156.74.181.208';
		console.warn('Unable to determine remote IP Address');
	}
	
	return requestJSON(IP_LOOKUP_BASE_URL + ip)
		.then((ipData) => {
			let lat = ipData.lat;
			let long = ipData.lon;
			
			// It is possible for this lookup to fail, if so we can't really complete the lookup
			if(!lat || !long) {
				throw new Error('Unable to find your location');
			}
			
			return [lat, long];
		})
}

/** getWeather
 * 
 * Get the weather data for a given latitude and longitude. Weather data
 * returned is determined by the darksky.net API, which can be viewed at
 * https://darksky.net/dev/docs/response
 * 
 * Requires the request object to be able to access the darksky API key
 * 
 * @param {Request} req - The current request being processed
 * @param {Float} lat - The latitude to use in the weather lookup
 * @param {Float} long - The longitude to use in the weather lookup
 * @return {Promise<Object>} Promise that resolves with the weather data
 *  as defined at https://darksky.net/dev/docs/response
 * 
 **/
function getWeather (req, lat, long) {
	let weatherUrl = WEATHER_LOOKUP_BASE_URL + req.webtaskContext.secrets.DARKSKY_API_KEY + '/' + lat + ',' + long;
	return requestJSON(weatherUrl);
}

/** getIcon
 * 
 * Generate an SVG icon that will be display based on the weather data
 * that is given.
 * 
 * @param {Object} weather - Weather data from darksky
 * @returns {String} SVG image string representing the weather
 **/
function getIcon(weather) {
	const icon = weather.currently.icon;
	
	// Base SVG declaration
	let svg = `<?xml version="1.0" encoding="UTF-8" ?>
<svg xmlns="http://www.w3.org/2000/svg" version="1.1" viewbox="0 0 200 230">`;
	
	// Draw the bottom layer
	switch(icon) {
		case 'clear-day':
		case 'partly-cloudy-day':
			svg += SVG_SUN;
			break;
		case 'clear-night':
		case 'partly-cloudy-night':
			svg += SVG_MOON;
			break;
		case 'rain':
			svg += SVG_RAIN;
			break;
		case 'snow':
		case 'hail': // TODO: Unique hail icon
			svg += SVG_SNOW;
			break;
		case 'sleet':
			svg += SVG_RAIN;
			svg += SVG_SNOW;
			break;
		case 'wind':
			svg += SVG_WIND;
			break;
	}
	
	// Draw the cloud on top
	switch(icon) {
		case 'clear-day':
		case 'clear-night':
		case 'wind':
			break;
		case 'partly-cloudy-day':
		case 'partly-cloudy-night':
			svg += '<g ' + SVG_PARTLY_CLOUDY_TRANSFORM + '>';
			// Fall-through to draw cloud
		default:
			svg += SVG_CLOUD;
	}
	
	// Close partly cloudy transformation group
	if(icon === 'partly-cloudy-day' || icon === 'partly-cloudy-night') {
			svg += '</g>';
	}
	
	// Dark Sky API use requires credit
	svg += SVG_CREDIT;
	
	return svg + '</svg>';
}

// SVG Content
const SVG_SUN = `
<g fill="#FFE000" stroke="#FEE000">
	<circle r="30" cx="100" cy="100" />
	<g transform="translate(100 100)">
		<line x1="0" x2="0" y1="35" y2="70" stroke-width="4" transform="rotate(0)"  />
		<line x1="0" x2="0" y1="35" y2="60" stroke-width="4" transform="rotate(45)"  />
		<line x1="0" x2="0" y1="35" y2="70" stroke-width="4" transform="rotate(90)"  />
		<line x1="0" x2="0" y1="35" y2="60" stroke-width="4" transform="rotate(135)" />
		<line x1="0" x2="0" y1="35" y2="70" stroke-width="4" transform="rotate(180)" />
		<line x1="0" x2="0" y1="35" y2="60" stroke-width="4" transform="rotate(225)" />
		<line x1="0" x2="0" y1="35" y2="70" stroke-width="4" transform="rotate(270)" />
		<line x1="0" x2="0" y1="35" y2="60" stroke-width="4" transform="rotate(315)" />
	</g>
</g>
`;

const SVG_MOON = `
<g fill="#E0E0E0">
	<circle r="50" cx="100" cy="100" />
	<g fill="#CCCCCC">
		<circle r="10" cx="80" cy="90" />
		<circle r="7" cx="115" cy="110" />
		<circle r="8" cx="90" cy="120" />
	</g>
</g>
`;

const SVG_CLOUD = `
<g fill="#ACACAC">
	<circle r="40" cx="120" cy="70" />
	<circle r="35" cx="70" cy="90" />
	<circle r="40" cx="140" cy="90" />
	<circle r="35" cx="100" cy="105" />
</g>
`;
const SVG_PARTLY_CLOUDY_TRANSFORM = 'transform="translate(20 50)"';

const SVG_RAIN = `
<g stroke="#1F90CC" stroke-width="2" transform="translate(100 100) rotate(25)">
	<line x1="0" x2="0" y1="35" y2="60" transform="translate(10 20)"   />
	<line x1="0" x2="0" y1="35" y2="60" transform="translate(-20 10)"  />
	<line x1="0" x2="0" y1="35" y2="60" transform="translate(0 0)"     />
	<line x1="0" x2="0" y1="35" y2="60" transform="translate(30 30)"   />
	<line x1="0" x2="0" y1="35" y2="60" transform="translate(20 -10)"  />
	<line x1="0" x2="0" y1="35" y2="60" transform="translate(40 -5)"   />
	<line x1="0" x2="0" y1="35" y2="60" transform="translate(50 -30)"  />
	<line x1="0" x2="0" y1="35" y2="60" transform="translate(-40 -10)" />
	<line x1="0" x2="0" y1="35" y2="60" transform="translate(-30 40)"  />
</g>
`;

const SVG_SNOW = `
<g fill="#FFFFFF" transform="translate(100 130)">
	<circle r="7" cx="25" cy="15" />
	<circle r="7" cx="35" cy="50" />
	<circle r="7" cx="50" cy="20" />
	<circle r="7" cx="10" cy="60" />
	<circle r="7" cx="-50" cy="20" />
	<circle r="7" cx="0" cy="35" />
	<circle r="7" cx="-20" cy="10" />
	<circle r="7" cx="-35" cy="45" />
</g>`;

const SVG_WIND = `
<g fill="none" stroke="#FFFFFF" stroke-width="3" transform="translate(0, 40)">
	<g>
		<path d="M 10,30 Q 70,50 110,23 L 110,59" fill="#D9F4FF" />
		<circle r="20" cx="120" cy="40" fill="#D0EFFF" opacity="0.9"/>
	</g>
	<g transform="translate(20, 25)">
		<path d="M 30,30 Q 70,50 110,23 L 110,59" fill="#D9F4FF" />
		<circle r="20" cx="120" cy="40" fill="#D0EFFF" opacity="0.9"/>
	</g>
	<g transform="translate(50, 50)">
		<path d="M 40,30 Q 70,50 110,23 L 110,59" fill="#D9F4FF" />
		<circle r="20" cx="120" cy="40" fill="#D0EFFF" opacity="0.9"/>
	</g>
</g>
`;

const SVG_CREDIT = '<text fill="#606060" x="0" y="220" font-size="10" font-family="Helvetica">Powered By Dark Sky</text>';
