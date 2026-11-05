# Chipper: An AI Watchlist Depleter

I would like to dedicate this project to family. Use Chipper to get through your to do lists, watch laters, episodes, as fast as possible, so that you can to spend valuable (and decluttered) time with them. Ideally, you prioritse them before you yt vids anyway.

Chip away at your entertainment backlog & optimise the way you consume media.

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

- [ ] Be able to Close video and don't let it take you to a new yt tab
- [x] Have a better flow (entrance page -> YT Dashboard)
- [ ] Get domain and publish
- [ ] use the indexeddb to genuinely save preferences

## Syncing

- [ ] Delta sync vs full sync - for sync performance, it would be good to sort YT WL by date added and check against the existing chip list. Once you come across an exisitng video, it is safe to say the rest of the list should already be there. This has it's flaws, watching something further down the list, the links will all be off. Something to reconcile with the "chip" feature. Something users should be able to select before syncing.
- [ ] To sync with yt, will need a delete function. perhaps in chipper, have a way to 'chip' away at the vids. these can be saved in a 'chiplist' so when you go to delete from youtube, the exetension goes trough the chip list and deletes them for you
- [ ] support csv watchlater playlist import

## Spotify Integration

- [x] Connect to Spotify
- [ ] Implement podcasts
- [ ] Add Album trackings
  - [ ] You can set to listen (headphones)
  - [ ] You can love, if you don't like it, why's it in your library?? (heart)
  - [ ] Listen later priorities
- [ ] Get and filter by genre
- [ ] Make sure genre enrichment tracks which albums didn't get a genre
- [ ] Develop a smart way to check whether albums have been added or removed on spotify
- [ ] Filter by decade
- [ ] sort by release date, artist, name
- [ ] get runtime, number of track, link to spotify to listen
- [ ] Make the albums a proper card

## Future Product

- [ ] Find a way to get all thumbnails
- [ ] Likely need to make AI clusters a premium feature, use the cloud to host a dockerised AI service that can be used instead of anything local. it will slow down the application too much
  - [ ] for ai clusters, user should be able to input how many categories they'd like and include warning that not giving a number will result in the ai experimenting up to 30 groupings
- [ ] Make it a product, if this becomes popular, syncing across devices via cloud could be beneficial, this may cost money though, but will always be optional

## Where things should go moving forward

Make chipper a self hosting service. Use a db like mysql, I don't think the online version is neccessary at all anymore. So try to convert the client side DB to a mysql DB. Ideally behave similarly to home server software, applications like Jellyfin are a good inspiration, not in terms of functionality but the architecture, how it is very docker freidnly etc.

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
