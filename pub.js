"use strict";

var thoonk = require('thoonk').createClient();
var Job = require('thoonk-jobs');

var item = {
    id: 12345,
    config: {
        language: "JS",
        timeout: 50000
    },
    payload: {
        commands: [
            "npm -v"
        ]
    }
};

thoonk.registerObject('Job', Job, function () {

    var jobPublisher = thoonk.objects.Job('buildQueue');
    jobPublisher.subscribe(function () {

        jobPublisher.publish(item, {
            //id: 'customId',
            //priority: true, // push the job to the front of the queue
            onFinish: function () {
                console.log('Job completed!');
            }
        }, function () {
            console.log('Job published');
        });

    });
});


