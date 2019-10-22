// set the dimensions and margins of the graph
export function plotHist(data, target, colorFunc) {
  var margin = { top: 10, right: 0, bottom: 50, left: 60 },
    width = 220 - margin.left - margin.right,
    height = 220 - margin.top - margin.bottom;

  // append the svg object to the body of the page
  var svg = d3
    .select(target)
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

  // X axis: scale and draw:
  var x = d3
    .scaleLinear()
    .domain([-0.5, 6]) // can use this instead of 1000 to have the max of data: d3.max(data, function(d) { return +d.price })
    .range([0, width]);
  svg
    .append("g")
    .attr("transform", "translate(0," + height + ")")
    .call(
      d3
        .axisBottom(x)
        .tickValues([0, 1, 2, 3, 4, 5])
        .tickFormat(d3.format(",.0f"))
    );

  // set the parameters for the histogram
  var histogram = d3
    .histogram()
    .value(function(d) {
      return d;
    }) // I need to give the vector of value
    .domain(x.domain()) // then the domain of the graphic
    .thresholds(x.ticks(5)); // then the numbers of bins

  // And apply this function to data to get the bins
  var bins = histogram(data);
  // Y axis: scale and draw:
  var y = d3.scaleLinear().range([height, 0]);
  y.domain([
    0,
    d3.max(bins, function(d) {
      return d.length;
    })
  ]); // d3.hist has to be called before the Y axis obviously
  svg.append("g").call(d3.axisLeft(y).ticks(4, "f"));

  // append the bar rectangles to the svg element
  svg
    .selectAll("rect")
    .data(bins)
    .enter()
    .append("rect")
    .attr("x", 1)
    .attr("transform", function(d) {
      return "translate(" + x(d.x0 - 0.5) + "," + y(d.length) + ")";
    })
    .attr("width", function(d) {
      return x(d.x1) - x(d.x0) - 1;
    })
    .attr("height", function(d) {
      return height - y(d.length);
    })
    .style("fill", function(d) {
      // return "rgb("+d.x0*40+",0,0)";
      let color = colorFunc(d.x0);
      return "rgb(" + color[0] + "," + color[1] + "," + color[2] + ")";
    })
    .attr("stroke-width", 1)
    .attr("stroke", "black");

  svg
    .append("text")
    .attr("class", "x label")
    .attr("text-anchor", "center")
    .attr("x", width / 2.5)
    .attr("y", height + margin.top + margin.bottom / 2)
    .text("Rank");

  svg
    .append("text")
    .attr("class", "y label")
    .attr("text-anchor", "end")
    .attr("y", 30)
    .attr("dy", -margin.left - 14)
    .attr("transform", "rotate(-90)")
    .text("Number of Cells");
}
