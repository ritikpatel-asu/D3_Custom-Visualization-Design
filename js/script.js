//parsing string values
function parseValue(value) {
  if (typeof value === "string") {
    value = value.trim().toLowerCase();
    if (value.endsWith("m")) return parseFloat(value) * 1e6;
    if (value.endsWith("k")) return parseFloat(value) * 1e3;
    if (value.endsWith("b")) return parseFloat(value) * 1e9;
  }
  return parseFloat(value);
}

let isCardVisible = false;

d3.csv("/dataset/insta.csv")
  .then(data => {
    console.log("data loaded", data);
    data.forEach(d => {
      d.Followers = parseValue(d.Followers);
      d["60-Day Eng Rate"] = parseValue(d["60-Day Eng Rate"]);
      d["Influence Score"] = parseFloat(d["Influence Score"]);
      d.Rank = +d.Rank;
    });
    const width = window.innerWidth;
    const height = window.innerHeight;
    const maxFollowers = d3.max(data, d => d.Followers);
    const minFollowers = d3.min(data, d => d.Followers);
    const radiusScale = d3.scaleSqrt()
      .domain([minFollowers, maxFollowers])
      .range([20, 65]); //circle size adjustments

    //vz svg
    const container = d3.select("#chart").append("div")
      .style("position", "relative")
      .style("width", "100%")
      .style("height", `${height}px`)
      .style("display", "flex")
      .style("justify-content", "center");

    const svg = container.append("svg")
      .attr("width", width)
      .attr("height", height)
      .style("overflow", "visible");

    //map bg
    const mapGroup = svg.append("g")
      .attr("class", "world-map");
    mapGroup.append("image")
      .attr("href", "/svg/map.svg")
      .attr("x", 0)
      .attr("y", 0)
      .attr("width", width)
      .attr("height", height)
      .style("opacity", 0.20);

  //filter
  const filterContainer = container.append("div")
    .attr("class", "filter")
    .style("position", "absolute")
    .style("top", "10px")
    .style("left", "10px")
    .style("background", "rgba(100, 100, 100, 0.3)")
    .style("border-radius", "15px")
    .style("padding", "10px")
    .style("box-shadow", "0 0 5px rgba(0, 0, 0, 0.7)");

  const countries = Array.from(new Set(data.map(d => d["Country Or Region"])))
    .sort();

  filterContainer.append("div")
    .text("Influencers by Country")
    .style("font-weight", "bold")
    .style("margin-bottom", "5px")
    .style("font-size", "14px")
    .style("color", "#333");

  const clearButton = filterContainer.append("button")
    .text("Clear Filters")
    .style("display", "block")
    .style("margin", "0 auto 10px")
    .style("font-size", "12px")
    .style("padding", "5px")
    .style("cursor", "pointer")
    .style("text-align", "center")
    .on("click", clearFilters);

  countries.forEach(country => {
    const countryLabel = filterContainer.append("label")
      .style("display", "flex")
      .style("align-items", "center")
      .style("margin-bottom", "5px")
      .style("font-size", "12px")
      .style("color", "black");

  countryLabel.append("input")
    .attr("type", "checkbox")
    .attr("value", country)
    .on("change", filterByCountry);

  countryLabel.append("span")
    .text(country)
    .style("margin-left", "5px");
});

function clearFilters() {
  filterContainer.selectAll("input[type='checkbox']").property("checked", false);
  updateCircles(data);
}

function filterByCountry() {
  const selectedCountries = Array.from(filterContainer.selectAll("input:checked").nodes())
    .map(input => input.value);

  const filteredData = selectedCountries.length > 0
    ? data.filter(d => selectedCountries.includes(d["Country Or Region"]))
    : data;

  updateCircles(filteredData);
}

function updateCircles(filteredData) {
  const circles = svg.selectAll("circle")
    .data(filteredData, d => d.Rank);

  circles.join(
    enter => enter.append("circle")
      .attr("r", d => radiusScale(d.Followers))
      .attr("stroke", "#ffffff")
      .attr("stroke-width", 1.5)
      .attr("opacity", 0.9)
      .attr("fill", d => `url(#image-${d.Rank})`)
      .attr("cx", d => d.x)
      .attr("cy", d => d.y)
      .on("mouseover", (event, d) => {
        tooltip.transition().duration(200).style("opacity", 0.9);
        tooltip.html(`<strong>${d["Channel Info"]}</strong>`)
          .style("left", (event.pageX + 5) + "px")
          .style("top", (event.pageY - 28) + "px");
        d3.select(event.currentTarget)
          .transition()
          .duration(300)
          .attr("r", radiusScale(d.Followers) * 1.3);
      })
      .on("mouseout", (event, d) => {
        tooltip.transition().duration(500).style("opacity", 0);
        d3.select(event.currentTarget)
          .transition()
          .duration(300)
          .attr("r", radiusScale(d.Followers));
      })
      .on("click", (event, d) => {
        if(!isCardVisible) { 
          card.transition().duration(300).style("opacity", 1);
          card.html(`
            <div class="card-content">
              <div class="card-image" style="padding-left: 35px">
                <img src="${d.ImageURL}" alt="${d["Channel Info"]}" style="width: 150px; height: 130px; border-radius: 5px;"/>
              </div>
              <h2 style="text-align:center;">${d["Channel Info"]}</h2>
              <p style="text-align:left;"><strong>Country:</strong> ${d["Country Or Region"]}</p>
              <p style="text-align:left;"><strong>Influence Score:</strong> ${d["Influence Score"]}</p>
              <p style="text-align:left;"><strong>Followers:</strong> ${d.Followers/1e6}${"m"}</p>
              <p style="text-align:left;"><strong>Average Likes:</strong> ${d["Avg. Likes"]}</p>
              <p style="text-align:left;"><strong>Posts:</strong> ${d.Posts}</p>
            </div>`)
            .style("left", (event.pageX + 10) + "px")
            .style("top", (event.pageY + 10) + "px");

          isCardVisible = true;
        } else {
          card.transition().duration(300).style("opacity", 0);
          isCardVisible = false;
        }
        event.stopPropagation();
      }),
      update => update,
      exit => exit.remove()
  );
}

//legend
const legendContainer = container.append("div")
  .attr("class", "legend")
  .style("position", "absolute")
  .style("top", "10px")
  .style("right", "15px")
  .style("background", "rgba(100, 100, 100, 0.3)")
  .style("border-radius", "15px")
  .style("padding", "10px")
  .style("box-shadow", "0 0 5px rgba(0, 0, 0, 0.7)");

const legendItems = [
  { color: "#543123", description: "Each circle comprises of influencer image" },
  { color: "#ffcc00", description: "Circle size represents follower count" },
  { color: "#007bff", description: "Hover to see influencer's instagram handle" },
  { color: "#ff5733", description: "Click to open detailed card" },
  { color: "#664366", description: "Click outside to close the card" },
  { color: "#356743", description: "Filter to view influencers by Country" }
];

legendItems.forEach(item => {
  const legendItem = legendContainer.append("div")
    .style("display", "flex")
    .style("align-items", "center")
    .style("margin-bottom", "5px");

  legendItem.append("div")
    .style("width", "15px")
    .style("height", "15px")
    .style("background-color", item.color)
    .style("border-radius", "40%")
    .style("margin-right", "5px");
  
  legendItem.append("span")
    .text(item.description)
    .style("font-size", "12px")
    .style("color", "black");
});

//tooltip
const tooltip = d3.select("body").append("div")
  .attr("class", "tooltip")
  .style("opacity", 0);

//info card
const card = d3.select("body").append("div")
  .attr("class", "card")
  .style("opacity", 0);

//force simulation
const simulation = d3.forceSimulation(data)
  .force("charge", d3.forceManyBody().strength(10 + Math.random() * 5))
  .force("center", d3.forceCenter(width / 2, height / 2))
  .force("collision", d3.forceCollide(d => radiusScale(d.Followers) + 1 + Math.random() * 2))
  .on("tick", ticked);

//animation
function ticked() {
  const circles = svg.selectAll("circle")
    .data(data, d => d.Rank);

  circles.join("circle")
    .attr("r", d => radiusScale(d.Followers))
    .attr("stroke", "#ffffff")
    .attr("stroke-width", 1.5)
    .attr("opacity", 0.9)
    .attr("fill", d => `url(#image-${d.Rank})`)
    .attr("cx", () => Math.random() * width * 1.5)
    .attr("cy", () => Math.random() * height * 1.5)
    .style("transform", "scale(0)")
    .transition()
    .duration(500)
    .delay((d, i) => i * 40)
    .ease(d3.easeCubicOut)
    .attr("cx", d => d.x)
    .attr("cy", d => d.y)
    .style("transform", "scale(1)");

  circles
    .on("mouseover", (event, d) => {
      tooltip.transition().duration(200).style("opacity", 0.9);
      tooltip.html(`<strong>${d["Channel Info"]}</strong>`)
        .style("left", (event.pageX + 5) + "px")
        .style("top", (event.pageY - 28) + "px");

      d3.select(event.currentTarget)
        .transition()
        .duration(300)
        .attr("r", radiusScale(d.Followers) * 1.3)
        .attr("fill", d => `url(#image-hover-${d.Rank})`);
    })
    .on("mouseout", (event, d) => {
      tooltip.transition().duration(500).style("opacity", 0);
      d3.select(event.currentTarget)
        .transition()
        .duration(300)
        .attr("r", radiusScale(d.Followers))
        .attr("fill", `url(#image-${d.Rank})`);
    })
    .on("click", (event, d) => {
      if(!isCardVisible) { 
        card.transition().duration(300).style("opacity", 1);
        card.style("pointer-events", "auto");
        card.html(`
          <div class="card-content">
            <div class="card-image" style="padding-left: 35px">
              <img src="${d.ImageURL}" alt="${d["Channel Info"]}" style="width: 150px; height: 130px; border-radius: 5px;"/>
            </div>
            <h2 style="text-align:center;">${d["Channel Info"]}</h2>
            <p style="text-align:left;"><strong>Country:</strong> ${d["Country Or Region"]}</p>
            <p style="text-align:left;"><strong>Influence Score:</strong> ${d["Influence Score"]}</p>
            <p style="text-align:left;"><strong>Followers:</strong> ${d.Followers/1e6}${"m"}</p>
            <p style="text-align:left;"><strong>Average Likes:</strong> ${d["Avg. Likes"]}</p>
            <p style="text-align:left;"><strong>Posts:</strong> ${d.Posts}</p>
          </div>`)
        .style("left", (event.pageX + 10) + "px")
        .style("top", (event.pageY + 10) + "px");

        isCardVisible = true;
      }else{
        card.transition().duration(300).style("opacity", 0);
        card.style("pointer-events", "none");
        isCardVisible = false;
      }
      event.stopPropagation();
    });

  circles.exit().remove();      
}

//images
data.forEach(d => {
  svg.append("defs").append("pattern")
    .attr("id", `image-${d.Rank}`)
    .attr("patternUnits", "objectBoundingBox")
    .attr("width", 1)
    .attr("height", 1)
    .append("image")
    .attr("xlink:href", d.ImageURL)
    .attr("width", radiusScale(d.Followers) * 2)
    .attr("height", radiusScale(d.Followers) * 2)
    .attr("x", 0)
    .attr("y", 0);

    //hover
    svg.append("defs").append("pattern")
      .attr("id", `image-hover-${d.Rank}`)
      .attr("patternUnits", "objectBoundingBox")
      .attr("width", 1)
      .attr("height", 1)
      .append("image")
      .attr("xlink:href", d.ImageURL)
      .attr("width", radiusScale(d.Followers) * 2.6)
      .attr("height", radiusScale(d.Followers) * 2.6)
      .attr("x", 0)
      .attr("y", 0);
});

window.addEventListener('resize', () => {
  const newWidth = window.innerWidth;
  const newHeight = window.innerHeight;
  svg.attr("width", newWidth * 1.5).attr("height", newHeight * 1.5);
  simulation.force("center", d3.forceCenter(newWidth / 2, newHeight / 2));
  simulation.alpha(0.5).restart();
});

d3.select("body").on("click", function(event) {
  if (!event.target.closest(".card")) {
    card.transition().duration(300).style("opacity", 0);
    card.style("pointer-events", "none");
    isCardVisible = false;
  }
});
})
.catch(error => console.error('Error loading data:', error));
