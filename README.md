# Chipper: An AI Watchlist Depleter

I would like to dedicate this project to family. Use Chipper to get through your to do lists, watch laters, episodes, as fast as possible, so that you can to spend valuable (and decluttered) time with them. Ideally, you prioritse them before you yt vids anyway

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Optimise the way you consume media.

# TODO

- [ ] Clean up duration range
- [ ] have preset ranges (i.e. lunch time (<20mins>), chilling, video essay / doc (> 1 hour)
- [ ] toggle between ai generated categories
- [ ] clean up components
- [ ] clean up code
- [ ] Dockerise FE, AI
- [ ] Try to use a different solution to a JSON file for watchlater

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default tseslint.config({
  extends: [
    // Remove ...tseslint.configs.recommended and replace with this
    ...tseslint.configs.recommendedTypeChecked,
    // Alternatively, use this for stricter rules
    ...tseslint.configs.strictTypeChecked,
    // Optionally, add this for stylistic rules
    ...tseslint.configs.stylisticTypeChecked,
  ],
  languageOptions: {
    // other options...
    parserOptions: {
      project: ["./tsconfig.node.json", "./tsconfig.app.json"],
      tsconfigRootDir: import.meta.dirname,
    },
  },
});
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from "eslint-plugin-react-x";
import reactDom from "eslint-plugin-react-dom";

export default tseslint.config({
  plugins: {
    // Add the react-x and react-dom plugins
    "react-x": reactX,
    "react-dom": reactDom,
  },
  rules: {
    // other rules...
    // Enable its recommended typescript rules
    ...reactX.configs["recommended-typescript"].rules,
    ...reactDom.configs.recommended.rules,
  },
});
```
