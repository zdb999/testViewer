export function makeCompass(target, callback) {
  var centerX = 75;
  var centerY = 75;
  window.theta = 0;
  var innerRad = 30;
  var circleThickness = 5;
  var offset = 8;
  var svgContainer = d3
    .select(target)
    .append("svg")
    .attr("width", centerX * 2)
    .attr("height", centerY * 2);

  var circle = svgContainer
    .append("circle")
    .attr("cx", centerX)
    .attr("cy", centerY)
    .attr("r", innerRad)
    .style("fill", "none")
    .attr("stroke-width", circleThickness)
    .attr("stroke", "gray");

  function leftPointerData(theta) {
    var xComp = Math.sin(theta);
    var yComp = Math.cos(theta);
    return [
      { x: centerX + offset * xComp, y: centerY + offset * yComp },
      { x: centerX - offset * yComp, y: centerY + offset * xComp },
      {
        x: centerX - xComp * (innerRad + circleThickness / 2),
        y: centerY - yComp * (innerRad + circleThickness / 2)
      }
    ];
  }

  function rightPointerData(theta) {
    var xComp = Math.sin(theta);
    var yComp = Math.cos(theta);
    return [
      { x: centerX + offset * xComp, y: centerY + offset * yComp },
      { x: centerX + offset * yComp, y: centerY - offset * xComp },
      {
        x: centerX - xComp * (innerRad + circleThickness / 2),
        y: centerY - yComp * (innerRad + circleThickness / 2)
      }
    ];
  }

  //This is the accessor function
  var lineFunction = d3
    .line()
    .x(function(d) {
      return d.x;
    })
    .y(function(d) {
      return d.y;
    });

  function northTextCenter(theta) {
    var xComp = Math.sin(theta);
    var yComp = Math.cos(theta);
    let x = centerX - xComp * (innerRad + 25);
    let y = centerY - yComp * (innerRad + 25);
    return { x: x, y: y };
  }

  function resetNorth() {
    window.theta = 0;
    update(window.theta);
    callback(window.theta);
  }

  var left = svgContainer
    .append("path")
    .attr("d", lineFunction(leftPointerData(0)))
    .attr("fill", "#325F90");
  var right = svgContainer
    .append("path")
    .attr("d", lineFunction(rightPointerData(0)))
    .attr("fill", "slateblue");

  var northData = northTextCenter(window.theta);
  var northCircle = svgContainer
    .append("circle")
    .attr("cx", northData.x)
    .attr("cy", northData.y)
    .attr("r", 15)
    .on("click", resetNorth)
    .style("fill", "#325F90");

  var northText = svgContainer
    .append("text")
    .attr("x", northData.x)
    .attr("y", northData.y)
    .text("N")
    .attr("text-anchor", "middle")
    .attr("dominant-baseline", "central")
    .attr("font-family", "sans-serif")
    .attr("font-size", "14px")
    .attr("fill", "white")
    .attr("pointer-events", "none")
    .on("click", resetNorth);

  function update(theta) {
    window.theta = theta;
    left.attr("d", lineFunction(leftPointerData(theta)));
    right.attr("d", lineFunction(rightPointerData(theta)));
    northData = northTextCenter(theta);
    northCircle.attr("cx", northData.x).attr("cy", northData.y);
    northText.attr("x", northData.x).attr("y", northData.y);
  }

  var lastTheta = 0;
  var dragHandler = d3
    .drag()
    .on("start", function() {
      let x = d3.event.x - centerX;
      let y = d3.event.y - centerY;
      lastTheta = -Math.atan2(y, x);
    })
    .on("drag", function() {
      let x = d3.event.x - centerX;
      let y = d3.event.y - centerY;
      var clickTheta = -Math.atan2(y, x);
      update(window.theta + clickTheta - lastTheta);
      lastTheta = clickTheta;
    })
    .on("end", function() {
      callback(window.theta);
    });
  dragHandler(circle);
  dragHandler(left);
  dragHandler(right);
}

