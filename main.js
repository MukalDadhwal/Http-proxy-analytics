const express = require("express");
const { createProxyMiddleware } = require("http-proxy-middleware");
const app = express();
const zlib = require("zlib");

const proxyMiddleware = (targetUrl) => {
  return createProxyMiddleware({
    target: targetUrl,
    changeOrigin: true,
    selfHandleResponse: true,
    onProxyRes: (proxyRes, req, res) => {
      console.log("in proxy res");
      let body = [];

      // Collect response chunks in an array
      proxyRes.on("data", (chunk) => {
        console.log("data recevied... ");
        body.push(chunk);
      });
      proxyRes.on("end", () => {
        body = Buffer.concat(body);
        console.log(body);
        // Check if response is compressed (gzip or deflate)
        const encoding = proxyRes.headers["content-encoding"];
        if (encoding === "gzip") {
          zlib.gunzip(body, (err, decoded) => {
            if (err)
              return res.status(500).send("Error decompressing response");
            injectAndSend(decoded);
          });
        } else if (encoding === "deflate") {
          zlib.inflate(body, (err, decoded) => {
            if (err)
              return res.status(500).send("Error decompressing response");
            injectAndSend(decoded);
          });
        } else if (encoding === "br") {
          zlib.brotliDecompress(body, (err, decoded) => {
            console.log(typeof decoded);
            if (err)
              return res
                .status(500)
                .send("Error decompressing Brotli response");
            injectAndSend(decoded.toString("utf-8"));
          });
        } else {
          // If not compressed, just send the body
          injectAndSend(body.toString());
        }

        function injectAndSend(decodedBody) {
          const script = `
        <script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
        new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
        j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
        'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
        })(window,document,'script','dataLayer','GTM-PSV2ZRSB');</script>
        `;

          console.log("original body: \n" + decodedBody);

          // // Modify the body by injecting the script before </head>
          // const modifiedBody = decodedBody.replace("<head>", `<head>${script}`);

          // console.log("modifiedBody: \n" + modifiedBody);
          res.send(decodedBody.toString("utf-8"));
        }
      });
    },
    onError: (err, req, res) => {
      console.error("Proxy error:", err);
      res.status(500).send("Something went wrong.");
    },
  });
};

app.get("/recommend/:site", (req, res, next) => {
  console.log("GET REQUEST RECEIVED...");
  const targetSite = req.params.site;

  if (!targetSite) {
    return res.status(400).send("No target site provided");
  }

  const targetUrl = `https://${targetSite}.org`;
  console.log("TARGET: " + targetUrl);

  proxyMiddleware(targetUrl)(req, res, next);
});

// Start the server
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
