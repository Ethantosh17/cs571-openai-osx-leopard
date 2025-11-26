# cs571-openai-osx-leopard
We did a project in CS571 where we wrote our own React code around a provided CS571 wrapper of the OpenAI API. This is an adaptation of that project that works on Safari 3.1.2, because I thought it would be fun to use "ChatGPT" on a PowerPC Mac.

This requires a modern device with Node.js installed to use as a proxy as well as a device running Mac OS X Leopard (or newer). I don't know how recent the proxy device has to be, but a Mac running Monterey worked fine for me, so I'll give instructions for that.

Instructions:

1. Move index.html and chat-es3.js to the Mac running Leopard. It doesn't matter where they are, so long as they are in the same directory.
2. Move proxy.js to the modern Mac.
3. Put the local IP address of the modern Mac in chat-es3.js where it says "LOCAL_IP_OF_PROXY_SERVER"
4. Put the CS571 Badger ID in proxy.js where it says "PUT BADGER ID HERE"
5. Open terminal on the modern Mac and cd to where you put proxy.js.
6. Run the following commands: "npm install express http-proxy-middleware" and then "node proxy.js". It should confirm that the proxy is running.
7. Open index.html on the Mac running Leopard with Safari.
8. Voila!
