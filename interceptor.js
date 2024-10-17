const express = require("express");
const axios = require("axios");
const {
  createProxyMiddleware,
  responseInterceptor,
} = require("http-proxy-middleware");

const app = express();
const PORT = 3000;

// Proxy middleware
const myHttpMiddleware = createProxyMiddleware({
  target: "https://google.com", // FreeCodeCamp as the target
  changeOrigin: true, // Needed for virtual hosted site
  selfHandleResponse: true,
  pathRewrite: {
    "^/proxy": "", // Remove '/proxy' from the forwarded path
  },
  logLevel: "debug", // Enable logging for troubleshooting
  onProxyReq: (proxyReq, req, res) => {
    console.log("Proxy Request: ", req.url);
  },
  onProxyRes: responseInterceptor(
    async (responseBuffer, proxyRes, req, res) => {
      const statusCode = proxyRes.statusCode;

      console.log(statusCode);

      if (statusCode === 302 || statusCode === 301) {
        console.log("location header: " + proxyRes.headers.location);
        const redirectUrl = proxyRes.headers.location; // Extract the Location header
        console.log(`Redirecting to: ${redirectUrl}`);

        try {
          // Fetch the HTML from the new location using axios
          const redirectResponse = await axios.get(redirectUrl);
          let html = redirectResponse.data; // Get the HTML content

          console.log("Fetched HTML from redirected URL"); // Debug log for fetched HTML

          // Modify the HTML as needed
          html = html.replace(
            "<head>",
            "<head><script>alert('Redirected and modified');</script>"
            // "<head><script src='myscript.js'></script>"
          );

          // Send the modified HTML as the response
          res.status(200).send(html);
        } catch (error) {
          console.error("Error fetching redirected page: ", error.message);
          res.status(500).send("Error following redirect");
        }
        return;
      }

      const response = responseBuffer.toString("utf8"); // convert buffer to string

      console.log(response);

      return response.replace("<head>", "<head><script>"); // manipulate response and return the result
    }
  ),

  // onProxyRes: (proxyRes, req, res) => {
  //   console.log("Proxy Response: ", proxyRes.statusCode);

  //   if(proxyRes.statusCode == 200){
  //     proxyRes.
  //   }
  //   else{
  //     res.status(500).send("Status code of the target is not 200" + proxyRes.statusCode );
  //   }
  // },
  onError: (err, req, res, target) => {
    res.status(500).send("Something went wrong.");
  },
});

// Use the middleware for /proxy
app.use("/proxy", myHttpMiddleware);

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
