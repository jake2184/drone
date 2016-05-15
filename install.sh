

apidoc -i lib/ -o public/documentation/api -t apiDocsTemplate
jsdoc lib/functions.js -d public/documentation/api
istanbul cover node_modules/mocha/bin/_mocha -- -R spec