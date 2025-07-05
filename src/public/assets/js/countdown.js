var countdownElement = document.getElementById('countdown');
var interval;

function startCountdown(totalSeconds, callback) {
    if (interval) return;
    var minutes = Math.floor(totalSeconds / 60);
    var seconds = totalSeconds % 60;
    countdownElement.innerHTML = (minutes < 10 ? "0" + minutes : minutes) + ":" + (seconds < 10 ? "0" + seconds : seconds);

    interval = setInterval(function() {
        seconds -= 1;
        if (seconds < 0) {
            seconds = 59;
            minutes -= 1;
        }
        
        if (minutes < 0) {
            clearInterval(interval);
            countdownElement.innerHTML = "00:00";
            if (typeof callback === 'function') {
                callback();
            }
            return;
        }

        var displayMinutes = (minutes < 10) ? "0" + minutes : minutes;
        var displaySeconds = (seconds < 10) ? "0" + seconds : seconds;

        countdownElement.innerHTML = displayMinutes + ":" + displaySeconds;
    }, 1000);
}

window.startCountdown = startCountdown;