/* eslint no-console: off */
import ROSLIB from 'roslib';

function noop () {}

function connect ({url, onConnection, onDetected, onWheelsCmd, onError, onClose} = {}) {
	if (!url) throw new Error('Bot roslib url required for usage.');

	const ros = new ROSLIB.Ros({url});

	ros.on('connection', onConnection || (() => console.log(`ROSLIB: Connected to ${url}`)));
	ros.on('error', onError || (err => console.log(`ROSLIB Error: ${JSON.stringify(err)}`)));
	ros.on('close', onClose || (() => console.log(`ROSLIB: Connection closed to ${url}`)));

	// To see the topic generator:
	// cat /usr/lib/python3.5/site-packages/object_classifier/object_classification.py

	// Subscribing to a Topic
	const detected = new ROSLIB.Topic({
		ros: ros,
		name: '/object_classifier/output',
		messageType: 'duckietown_msgs/ClassifiedObject'
	});

	const wheels_cmd = new ROSLIB.Topic({
		ros: ros,
		name: "/wheels_cmd",
		messageType: "duckietown_msgs/WheelsCmdStamped"
	});
	// wheels_cmd.subscribe(m => {
	// 	$("#rwheel").value = m.vel_right;
	// 	$("#lwheel").value = m.vel_left;
	// });

	detected.subscribe(onDetected || noop);
	wheels_cmd.subscribe(onWheelsCmd || noop);
	return {ros, detected, wheels_cmd};
}

export default connect;
