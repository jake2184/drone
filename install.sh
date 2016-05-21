
npm install -g apidoc
apidoc -i lib/ -o public/documentation/api -t apiDocsTemplate
npm install -g jsdoc
jsdoc lib/functions.js -d public/documentation/api
npm install -g instanbul
istanbul cover node_modules/mocha/bin/_mocha -- -R spec