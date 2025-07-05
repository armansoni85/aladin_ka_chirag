var ServerAPI = (function () {
  var baseUrl = "https://mcapi.emmapiii.com"; 

  function sendXHR(method, url, data, callback) {
      var xhr = new XMLHttpRequest();
      var TIMEOUT = 10000; // 10 seconds

      xhr.open(method, url, true);
      xhr.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
      xhr.timeout = TIMEOUT; 

      xhr.onreadystatechange = function() {
          if (xhr.readyState === 4) {
              if (xhr.status === 200) {
                  var responseData;
                  try {
                      responseData = JSON.parse(xhr.responseText);
                  } catch (e) {
                      return callback(new Error("Failed to parse response as JSON: " + xhr.responseText));
                  }
                  callback(null, responseData);
              } else {
                  callback(new Error("Request failed with status: " + xhr.status + ". " + xhr.responseText));
              }
          }
      };
      xhr.send(serialize(data));
  }

  function serialize(data) {
      return Object.keys(data).map(function(key) {
          return encodeURIComponent(key) + "=" + encodeURIComponent(data[key]);
      }).join("&");
  }

  function request(endpoint, method, data, callback) {
      sendXHR(method, baseUrl + endpoint, data, callback);
  }

  function getLocation(callback) {
      sendXHR("GET", "https://analyze.yemato.com", {}, function(err, res) {
          if (err) return callback(err);

          var latitude = res.latitude;
          var longitude = res.longitude;

          if (latitude !== undefined && longitude !== undefined) {
              callback(null, { latitude: latitude, longitude: longitude });
          } else {
              callback(null, { latitude: "", longitude: "" });
          }
      });
  }

  return {
      getData: function (endpoint, callback) {
          request(endpoint, "GET", {}, callback);
      },

      postData: function (endpoint, data, callback) {
          request(endpoint, "POST", data, callback);
      },

      getLocation: getLocation
  };
})();
