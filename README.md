# Chipper: An AI Watchlist Depleter

I would like to dedicate this project to family. Use Chipper to get through your to do lists, watch laters, episodes, as fast as possible, so that you can to spend valuable (and decluttered) time with them. Ideally, you prioritse them before you yt vids anyway.

Optimise the way you consume media.

# TODO

## Code & Design

- [ ] improve design
- [ ] clean up components
- [ ] clean up code
- [ ] light and dark mode
- [ ] remove bottom instructions (read them first though, they may be handy)
- [ ] Fix/confirm how the entire projct work
- [ ] Update the initial spiel and include instruction on how to get started

## Must Have Product

- [ ] Get domain and publish

## Syncing

- [ ] Delta sync vs full sync - for sync performance, it would be good to sort YT WL by date added and check against the existing chip list. Once you come across an exisitng video, it is safe to say the rest of the list should already be there. This has it's flaws, watching something further down the list, the links will all be off. Something to reconcile with the "chip" feature. Something users should be able to select before syncing.
- [ ] To sync with yt, will need a delete function. perhaps in chipper, have a way to 'chip' away at the vids. these can be saved in a 'chiplist' so when you go to delete from youtube, the exetension goes trough the chip list and deletes them for you
- [ ] support csv watchlater playlist import

## Future Product

- [ ] Find a way to get all thumbnails
- [ ] Chipify? Have a 'ChipHub' for access to both Chipper and Chipfy
  - [ ] Connect to Spotify
  - [ ] Implement podcasts
  - [ ] Add Album tracking
- [ ] Likely need to make AI clusters a premium feature, use the cloud to host a dockerised AI service that can be used instead of anything local. it will slow down the application too much
  - [ ] for ai clusters, user should be able to input how many categories they'd like and include warning that not giving a number will result in the ai experimenting up to 30 groupings
- [ ] Make it a product, if this becomes popular, syncing across devices via cloud could be beneficial, this may cost money though, but will always be optional

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
