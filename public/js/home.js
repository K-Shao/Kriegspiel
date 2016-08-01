function getCookie(name) {
  var value = "; " + document.cookie;
  var parts = value.split("; " + name + "=");
  if (parts.length == 2) return parts.pop().split(";").shift();
}

function deleteCookie( name ) {
  document.cookie = name + '=; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
}

$(document).ready(function() {
    var username = getCookie("user");
    $("#welcome").text("Welcome, " + username);
    $("#logout").click(function() {
        deleteCookie("user");
        deleteCookie("pass");
        document.location = "index.html";    
    });
});