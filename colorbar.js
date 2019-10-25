export function makeColorScale(target, colors, width, height) {
  var svg = d3
    .select(target)
    .append("svg")
    .attr("width", width)
    .attr("height", height);

  //Append a defs (for definition) element to your SVG
  var defs = svg.append("defs");

  //Append a linearGradient element to the defs and give it a unique id
  var linearGradient = defs
    .append("linearGradient")
    .attr("id", "linear-gradient" + colors.code);

  //Horizontal gradient
  linearGradient
    .attr("x1", "0%")
    .attr("y1", "0%")
    .attr("x2", "100%")
    .attr("y2", "0%");

  function convertColor(color) {
    return "rgb(" + color[0] + "," + color[1] + "," + color[2] + ")";
  }
  var colorList = [
    convertColor(colors.one),
    convertColor(colors.two),
    convertColor(colors.three),
    convertColor(colors.four),
    convertColor(colors.five)
  ];
  //A color scale
  var colorScale = d3.scaleLinear().range(colorList);

  //Append multiple color stops by using D3's data/enter step
  linearGradient
    .selectAll("stop")
    .data(colorScale.range())
    .enter()
    .append("stop")
    .attr("offset", function(d, i) {
      return i / (colorScale.range().length - 1);
    })
    .attr("stop-color", function(d) {
      return d;
    });

  //Draw the rectangle and fill with gradient
  svg
    .append("rect")
    .attr("width", width)
    .attr("height", height)
    .style("fill", "url(#linear-gradient" + colors.code + ")");
}
