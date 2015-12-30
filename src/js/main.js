'use strict';

angular
    .module('pocApp', [])
    .controller('ctrl', function(StudentManager) {
        var vm = this;

        vm.students = [];

        vm.addStudent = addStudent;
        vm.loadEvents = loadEvents;
        vm.start = start;

        function addStudent() {
            vm.students.push(StudentManager.create());
        }

        function loadEvents(student, filename) {
            StudentManager.loadEvents(student, filename);
        }

        function start(student) {
            StudentManager.startEvents(student);
        }
    });
