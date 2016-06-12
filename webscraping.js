var request = require('request');
var cheerio = require('cheerio');
var express = require('express');
var app = express();
var allowCrossDomain = function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "X-Requested-With");
  next();
}
 app.use(allowCrossDomain);

app.get('/update', function(req, res) {
  request('http://animeindo.web.id/page/1/', function (error, response, html) {
    if (!error && response.statusCode == 200) {
      var cat=[]
      var $ = cheerio.load(html);
  $("#episodes").children(".episode").each(
    function(index){
      var panda={gambar: $(this).children(".episode-image").children("a").children("img").attr("src"),
  judul: $(this).children(".episode-details").children("h3").children("a").text(),
  status: $(this).children(".episode-details").children("div").children(".mirror-sub").text(),
  jam:$(this).children(".episode-details").children("div").children(".episode-meta").text()
    }
  cat.push(panda)
    }
  )
  res.send(cat)
    }else{console.log("panda")}
  });
});
app.listen(process.env.PORT)
