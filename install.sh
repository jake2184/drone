
cd public
npm install dashboard
cd ..
npm install -g apidoc
apidoc -i lib/ -o public/documentation/api -t apiDocsTemplate
npm install -g jsdoc
jsdoc lib/functions.js -d public/documentation/functions
#npm install https://github.com/gotwarlost/istanbul
#istanbul cover node_modules/mocha/bin/_mocha -- -R spec