//console.log(d3.select("#topleft").style("width"));
//var width = parseInt(containerSelection.style("width"));
//console.log(element.getBoundingClientRect().width);

var margin = {top: 30, right: 10, bottom: 10, left: 10},
    width = 1800 - margin.left - margin.right,
    height = 500 - margin.top - margin.bottom,
    width2 = 900 - margin.left - margin.right;

var x = d3.scale.ordinal().rangePoints([0, width], 1),
    y = {};

var line = d3.svg.line(),
    axis = d3.svg.axis().orient("left"),
    background,
    foreground;

var selectedData  = [];
var nonselectedData  = [];
var demoDistricts = [];

// Define the div for the tooltip
var div = d3.select("body").append("div")
    .attr("class", "tooltip")
    .style("opacity", 0);

//clear previous
d3.selectAll("svg").remove();

var svg = d3.select("#top").append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
  .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    var svg2 = d3.select("#bottom").append("svg")
        .attr("width", width2 + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
      .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");


d3.csv("samlede_socio_data_kbh.csv", function(error, cars) {

  // Extract the list of dimensions and create a scale for each.
  x.domain(dimensions = d3.keys(cars[0]).filter(function(d) {
    //dont show name and year columns
    return d != "name" && d != "year" && d != "wkb_geometry" && d != "Entrepreneurs" && (y[d] = d3.scale.linear()
        .domain(d3.extent(cars, function(p) { return +p[d]; }))
        .range([height, 0]));
  }));

  socio = filterByYear(cars, "2013");

  // Add grey background lines for context.
  background = svg.append("g")
      .attr("class", "background")
    .selectAll("path")
      .data(socio)
    .enter().append("path")
      .attr("d", path);

  // Add blue foreground lines for focus.
  foreground = svg.append("g")
      .attr("class", "foreground")
    .selectAll("path")
      .data(socio)
    .enter().append("path")
      .attr("d", path);

  // Add a group element for each dimension.
  var g = svg.selectAll(".dimension")
      .data(dimensions)
    .enter().append("g")
      .attr("class", "dimension")
      .attr("transform", function(d) { return "translate(" + x(d) + ")"; });

  // Add an axis and title.
  g.append("g")
      .attr("class", "axis")
      .each(function(d) { d3.select(this).call(axis.scale(y[d])); })
    .append("text")
      .style("text-anchor", "middle")
      .attr("y", -9)
      .text(function(d) { return d; });

  // Add and store a brush for each axis.
  g.append("g")
      .attr("class", "brush")
      .each(function(d) { d3.select(this).call(y[d].brush = d3.svg.brush().y(y[d]).on("brush", brush)); })
    .selectAll("rect")
      .attr("x", -8)
      .attr("width", 16);

//DEMO 1

  foreground.style("display",function(d) {
    //console.log("d " + d["High income"]);
    if (d["High income"] < 60 )
      return "none";
      else
        demoDistricts.push(d["name"]);
  });

  svg.selectAll("g.dimension").filter(function(d){
    console.log("dtext: " + d);
    return d === "High income";
  })
  .attr("font-size","14px")
  .attr("font-weight","bold");
  //.text("text");

  d3.select("h2.storyline")
  .text("Story #1. High income districts are mostly Danish.");

  d3.select("p.message")
  .text("Interestingly, districts with high income percentages are pretty dispersed and not in the City center (except for coastal Østerbro).");

/*  d3.select("p.messagetwo")
  .text("Those high income districts are also well-educated (high Masters concentration) and have small children");*/

});

d3.json("http://wfs-kbhkort.kk.dk/k101/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=k101:samlede_socio_data_kbh&outputFormat=json&SRSNAME=EPSG:4326&maxfeatures=1000", function(error, json) {
  //Bind data and create one path per GeoJSON feature
  //console.log(json.features);

  var cleanerjsonfeatures = removeRepetitions(json);

  var center = d3.geo.centroid(json);
        var scale  = 120000;
        var offset = [width2/2, height/2.5];

        var projection = d3.geo.mercator().scale(scale).center([12.554322562596862,55.688013184009826])
                .translate(offset);

      //Define path generator, using the Albers USA projection
      var geopath = d3.geo.path()
      .projection(projection);

  //console.log(json.features);
  svg2.selectAll("path")
  .data(cleanerjsonfeatures)
  .enter()
  .append("path")
  .attr("d", geopath)
  .attr("class", "nonselected")
  /*.style("fill", "#4078c0")
  .style("fill-opacity", "0.2")
  .style("stroke-width", "0.7")
  .style("stroke", "#4078c0")
  .style("stroke-opacity", "0.5")*/
  .on("click", function(d) {
    d3.select(this)
    .attr("class","selected");
    highlightPath(d.properties.rodenavn);
  })
  .on("mouseover", function(d) {
    //console.log(d.properties.rodenavn);
    div.transition()
                .duration(200)
                .style("opacity", .9);
    div	.html(d.properties.rodenavn)
    .style("left", d3.event.pageX + "px")
    .style("top", d3.event.pageY + "px");
  });


  highlightDistricts();
}); //end load json

function highlightDistricts(){
  //for chosen data point change color of district in map-svg2
  console.log("highlightDistricts: " + demoDistricts);
  svg2.selectAll("path")
    .filter(function(d) {
      //return d.properties.rodenavn === "Ryparkens";
      for (var i = 0; i < demoDistricts.length; i++) {
        if (d.properties.rodenavn === demoDistricts[i]) {
            return d;
        }
      }
    })
  .attr("class", "selected");

}

function removeRepetitions(json) {
  //console.log(json.features[0].properties.rodenavn);
  var uniques = [];//unique rodenavns array
  var result = [];//features array
      for (var i = 0; i < json.features.length; i++) {
        if (uniques.indexOf(json.features[i].properties.rodenavn) == -1) {
          //console.log(json.features[i].rodenavn + " added");
          uniques.push(json.features[i].properties.rodenavn);
          result.push(json.features[i]);
        }
      }
  console.log("result length: " + result.length);
  return result;
}

function highlightPath(rodenavn) {
  console.log(rodenavn);
  //from svg1 select paths with those rodenavns
  svg.selectAll("path").filter(function(d) {
    //console.log(d.name);
    return d.name === rodenavn;
  })
  .style("stroke","orange")
  .style("stroke-opacity", "0.5");
}

// Returns the path for a given data point.
function path(d) {
  return line(dimensions.map(function(p) { return [x(p), y[p](d[p])]; }));
}

function filterByYear(data, year) {
  //console.log(data);
  //console.log(year);
  var result = [];
  for (var i = 0; i < data.length; i++) {
    if (data[i].year === year) {
        //console.log(data[i]);
        result.push(data[i]);
    }
  }
  //console.log(result);
  return result;
}

// Handles a brush event, toggling the display of foreground lines.
function brush() {
  //reset selectedData array
  selectedData = [];
  //reset all paths to default color - DOES NOT WORK
  svg2.selectAll("path").
  attr("class","nonselected");

  var actives = dimensions.filter(function(p) { return !y[p].brush.empty(); }),
      extents = actives.map(function(p) { return y[p].brush.extent(); });
  foreground.style("display", function(d) {
    console.log("actives: " + actives);
    console.log("extents: " + extents);
    return actives.every(function(p, i) {
      if (extents[i][0] <= d[p] && d[p] <= extents[i][1]) {
          //push brushed data to a separate array to filter districts later
          selectedData.push(d);
          //console.log(d); //print selected data
      } else {
          //selectedData.pop(d);
      }
      return extents[i][0] <= d[p] && d[p] <= extents[i][1];
    }) ? null : "none";
  });

  //console.log(selectedData.length);

  function extractRodenavns(data) {
    var result = [];
    //console.log(data.length);
    for (var i = 0; i < data.length; i++) {
      //console.log(data[i].name);
      //if not already in the array, add to it
      if (result.indexOf(data[i].name) == -1) {
        //console.log(data[i].name);
        result.push(data[i].name);
      }
    }
    //console.log(result.length);
    return result;
  }

  //extract unique rodenavns from them
  var rodenavns = extractRodenavns(selectedData);

  //filter paths of svg2 by rodenavns
  var districts = svg2.selectAll("path")
    .filter(function(d) {
      //return d.properties.rodenavn === "Ryparkens";
      for (var i = 0; i < rodenavns.length; i++) {
        if (d.properties.rodenavn === rodenavns[i]) {
            return d.properties.rodenavn;
        }
      }
    })
  .attr("class", "selected");

  //console.log("selected districts");
  //console.log(districts);

}
