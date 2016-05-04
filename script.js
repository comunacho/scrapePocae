var utils = require('utils');
var _ = require('lodash');

var resultTable;
var resultJson;
var cardNumber = '';
var userRut = '';
var url = 'http://pocae.tstgo.cl/PortalCAE-WAR-MODULE';
var loggedInSelector = 'img[src*="closelabel.jpg"]';
var movementsSelector = '#cboSeleccion';

var casper = require('casper').create({
  pageSettings: {
    loadImages: false,
    loadPlugins: false
  },
  logLevel: 'info',
  verbose: true
});

if (casper.cli.has(0) && casper.cli.has(1)){
  cardNumber = casper.cli.get(0);
  userRut = casper.cli.get(1);
} else {
  casper.echo('Usage is "casperjs script.js <cardNumber> <userRut>');
  casper.exit();
}

casper.saveToFile = casper.saveToFile || function(targetFile, fileContent) {

  var fs = require('fs');
  var f  = require('utils').format;

  // Get the absolute path.
  targetFile = fs.absolute(targetFile);
  // Let other code modify the path.
  targetFile = this.filter('page.target_filename', targetFile) || targetFile;
  this.log(f("Saving to %s", targetFile), "debug");
  // Try saving the file.
  try {
    fs.write(targetFile, fileContent, 'w');
  } catch(err) {
    this.log(f("Failed to save to %s; please check permissions", targetFile), "error");
    this.log(err, "debug");
    return this;
  }

  this.log(f("Saved to %s", targetFile), "info");
  // Trigger the page.saved event.
  this.emit('page.saved', targetFile);

  return this;
};

casper.stringify = function(what) {
    return JSON.stringify(what, null, '   ');
};

casper.on('remote.message', function (msg) {
  this.echo(msg);
});

casper.start(url, function () {
  this.log('=============================================', 'info');
  this.log('Scraping: ' + this.getTitle(), 'info');
  this.log('Tarjeta: ' + cardNumber + ' - RUT: ' + userRut, 'info');
  this.log('=============================================', 'info');
  cardNumber = cardNumber.toString();
  userRut = userRut.toString();
  this.sendKeys('#txtNumTarjeta', cardNumber);
});

casper.thenClick('#btnEnviar', function () {
  this.wait(1000, function () {
    if (!this.exists(loggedInSelector)) {
      this.sendKeys('#txtRutUsuario', userRut);
      this.thenClick('#btnValidar');
    }
  });
});

casper.waitForSelector(loggedInSelector, function () {
  this.clickLabel('Saldo y Movimientos', 'a');
});

casper.waitForSelector(movementsSelector, function () {

  this.fillSelectors('form#formMovimientos', {
    movementsSelector: '60'
  }, false);

  this.click('a[href*="BuscarMovimientos"]');
});

casper.wait(1000, function () {
  var table = this.evaluate(function () {
    var tableRows = [];
    $('tr[id*="fila"]').each(function () {
      var arr = [];
      $(this).children('td').each(function () {
        arr.push($(this).text().trim());
      });

      tableRows.push({
        id: arr[1],
        datetime: arr[3],
        place: arr[4],
        amount: arr[5]
      });
    });

    return tableRows;

  });

  resultTable = table;
  resultJson = this.stringify(table);
  this.saveToFile("result.json", resultJson);
});

casper.run(function() {

    var key, value;
    var _this = this;
    var perPriceResult = [];
    var prices = [20, 30, 610, 640, 660, 720, 740];

    _this.page.close();

    setTimeout(function exit(){

        _(prices).each(function(p){

          var filteredResult = _.filter(resultTable, function(o){
            return o.amount == p;
          });
          key = "$" + p;
          value = filteredResult.length;
          var obj = new Object();
          obj[key] = value;
          perPriceResult.push(obj);

        });

        _this.log(_this.stringify(perPriceResult), 'info');

        _this.exit(exitStatus);
    }, 0);
});
