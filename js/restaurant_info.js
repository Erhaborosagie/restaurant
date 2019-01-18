let restaurant;
var newMap;
window.addEventListener("load", () => {
  DBHelper.lateSubmission();
  initMap();
});
document.getElementById("postReviews").addEventListener("submit", postReviews);
function postReviews(e) {
  e.preventDefault();
  const params = {
    restaurant_id: parseInt(getParameterByName("id")),
    name: document.getElementById("reviewer").value,
    rating: document.querySelector('input[name="rate"]:checked').value,
    comments: document.getElementById("reviewMessage").value
  };
  fetch("http://localhost:1337/reviews/", {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify(params)
  })
    .then(res => res.json())
    .then(data => {
      DBHelper.dbPromise.then(function(db) {
        let tx = db.transaction("reviewStore", "readwrite");
        let store = tx.objectStore("reviewStore");
        store.put(data);
      });
    })
    .catch(err => {
      DBHelper.dbPromise.then(db => {
        console.log("No network");
        params.updatedAt = new Date().getTime();
        const tx = db.transaction("offlineReviews", "readwrite");
        const store = tx.objectStore("offlineReviews");
        store.put(params);
      });
    });
}
function showMap() {
  document.getElementById("map").style.display = "block";
  document.getElementById("map-container").style.display = "block";
  document.getElementById("restaurant-container").style.width = "50%";
  document.getElementById("reviews-container").style.width = "50%";
  document.getElementById("comment-container").style.width = "50%";
}
window.initMap = () => {
  fetchRestaurantFromURL((error, restaurant) => {
    if (error) {
      console.error(error);
    } else {
      self.map = new google.maps.Map(document.getElementById("map"), {
        zoom: 16,
        center: restaurant.latlng,
        scrollwheel: !1
      });
      fillBreadcrumb();
      DBHelper.mapMarkerForRestaurant(self.restaurant, self.map);
    }
  });
};
fetchRestaurantFromURL = callback => {
  if (self.restaurant) {
    callback(null, self.restaurant);
    return;
  }
  const id = getParameterByName("id");
  if (!id) {
    error = "No restaurant id in URL";
    callback(error, null);
  } else {
    DBHelper.fetchRestaurantById(id, (error, restaurant) => {
      self.restaurant = restaurant;
      if (!restaurant) {
        console.error(error);
        return;
      }
      DBHelper.fetchReviews(self.restaurant, (error, reviews) => {
        self.restaurant.reviews = reviews;
        if (!reviews) {
          console.error(error);
        }
        fillRestaurantHTML();
        callback(null, restaurant);
      });
    });
  }
};
fillRestaurantHTML = (restaurant = self.restaurant) => {
  const name = document.getElementById("restaurant-name");
  name.innerHTML = restaurant.name;
  const address = document.getElementById("restaurant-address");
  address.innerHTML = restaurant.address;
  const image = document.getElementById("restaurant-img");
  image.className = "restaurant-img";
  image.alt = restaurant.name + " image";
  image.src = DBHelper.imageUrlForRestaurant(restaurant);
  const cuisine = document.getElementById("restaurant-cuisine");
  cuisine.innerHTML = restaurant.cuisine_type;
  if (restaurant.operating_hours) {
    fillRestaurantHoursHTML();
  }
  fillReviewsHTML();
};
fillRestaurantHoursHTML = (
  operatingHours = self.restaurant.operating_hours
) => {
  const hours = document.getElementById("restaurant-hours");
  for (let key in operatingHours) {
    const row = document.createElement("tr");
    const day = document.createElement("td");
    day.innerHTML = key;
    row.appendChild(day);
    const time = document.createElement("td");
    time.innerHTML = operatingHours[key];
    row.appendChild(time);
    hours.appendChild(row);
  }
};
fillReviewsHTML = (reviews = self.restaurant.reviews) => {
  const container = document.getElementById("reviews-container");
  const title = document.createElement("h3");
  title.innerHTML = "Reviews";
  container.appendChild(title);
  if (!reviews) {
    const noReviews = document.createElement("p");
    noReviews.innerHTML = "No reviews yet!";
    container.appendChild(noReviews);
    return;
  }
  const ul = document.getElementById("reviews-list");
  reviews.forEach(review => {
    ul.appendChild(createReviewHTML(review));
  });
  container.appendChild(ul);
};
createReviewHTML = review => {
  const li = document.createElement("li");
  const name = document.createElement("p");
  name.innerHTML = review.name;
  li.appendChild(name);
  const date = document.createElement("p");
  date.innerHTML = review.date;
  li.appendChild(date);
  const rating = document.createElement("p");
  rating.innerHTML = `Rating: ${review.rating}`;
  li.appendChild(rating);
  const comments = document.createElement("p");
  comments.innerHTML = review.comments;
  li.appendChild(comments);
  return li;
};
fillBreadcrumb = (restaurant = self.restaurant) => {
  const breadcrumb = document.getElementById("breadcrumb");
  const li = document.createElement("li");
  li.innerHTML = restaurant.name;
  breadcrumb.appendChild(li);
};
getParameterByName = (name, url) => {
  if (!url) url = window.location.href;
  name = name.replace(/[\[\]]/g, "\\$&");
  const regex = new RegExp(`[?&]${name}(=([^&#]*)|&|#|$)`),
    results = regex.exec(url);
  if (!results) return null;
  if (!results[2]) return "";
  return decodeURIComponent(results[2].replace(/\+/g, " "));
};
