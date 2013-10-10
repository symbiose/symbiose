How to port Brackets to Symbiose
===

Retrieve the code
---

```
git clone https://github.com/adobe/brackets.git
git submodule update --init
```

Compile LESS ?
---

Doesn't work for the moment.

Check compatibility
---

Check https://github.com/adobe/brackets-shell/blob/7f4a66acdac513c6480cfd33c1ce694faf880f61/appshell/appshell_extensions.js

Extensions support ?
---

Change `extension_registry` and `extension_url` in `src/brackets.config.js` to an URL that support CORS headers.

Disable useless modules
---

Delete `src/extensions/default/StaticServer/`.