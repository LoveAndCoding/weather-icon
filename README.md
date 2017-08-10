# Weather Icon

This is a micro-service to display an icon based on the current weather for the location of the IP address requesting the image.

The service uses http://ip-api.com to first lookup the location of the requess IP address (falling back to a known address if unavailable). Once it obtains the latitude and longitude position, it uses those values to query the current weather from https://darksky.net/. It then generates an SVG image based on the weather to display an image to the user.

**Note:** Until auth0/webtask-runtime#7 is fixed, the location of the IP address will always fallback to the known address.
