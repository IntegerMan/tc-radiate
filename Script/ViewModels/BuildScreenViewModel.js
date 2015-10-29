﻿var BuildScreenViewModel = function () {
    var self = this;

    self.isFirstLoad  = ko.observable(true);
    self.builds       = ko.observableArray();
    self.buildTypes   = ko.observableArray();
    self.errorMessage = ko.observable();
    self.isLoading    = ko.observable(true);
    self.randomClass  = ko.observable(Utils.getRandomClass());
    self.mainBuild    = ko.observable();

    self.hasError = ko.computed(function () {
        if (!this.errorMessage())
            return false;
        return this.errorMessage().length > 0;
    }, self);

    self.init = function () {
        self.isLoading(true);
        self.loadBuildTypes();

        //Load a new build image every so often just for fun
        setInterval(function () { self.randomClass(Utils.getRandomClass()); }, Settings.buildImageIntervalMs);

    };

    self.loadAllBuilds = function () {
        self.isLoading(true);

        $.ajax({
                dataType: "json",
                url: Settings.buildsUrl + Utils.getTsQSParam(),
                xhrFields: {withCredentials: true},
                success: function (data) {
                          self.builds(ko.utils.arrayMap(data.build, function (build) {
                              return new SingleBuildViewModel(build, self.buildTypes());
                          }));
                
                          if (self.builds().length == 0)
                              self.errorMessage("There's no builds!? Better crack on with some work!");
                          else
                              self.errorMessage('');
                      }
            }).always(function () {
            self.isLoading(false);
            self.loadMainBuildStatus();
            if (Settings.enableAutoUpdate)
                setTimeout(self.loadAllBuilds, Settings.checkIntervalMs);
            if (self.isFirstLoad())
                self.isFirstLoad(false);
        });
    };

    self.loadBuildTypes = function () {
        self.isLoading(true);
		$.ajax({
                dataType: "json",
                url: Settings.buildTypesUrl,
                xhrFields: {withCredentials: true},
                success: function (data) {
                    self.buildTypes(data.buildType);
                    self.loadAllBuilds();
                    self.isLoading(false);
                }
            });
    };

    self.loadMainBuildStatus = function () {
        if (!self.builds().length)
            return;

        var url = Settings.mainBranch ?
            getBuildStatusUrlForBranch(Settings.mainBranch)
            :
            getBuildStatusUrlForBuildId((ko.utils.arrayFirst(self.builds(), function (build) {
                return build.status() === 'FAILURE';
            }) || self.builds()[0]).id());

        self.isLoading(true);
		$.ajax({
                dataType: "json",
                url: url + '?' + Utils.getTsQSParam(),
                xhrFields: {withCredentials: true},
                success: function (data) {
                    self.mainBuild(ko.mapping.fromJS(data, {
                        create: function(options) {
                            return new MainBuildViewModel(options.data, self.buildTypes());
                        }
                    }));
                }
        }).always(function (){
            self.isLoading(false);
        });
    };

    self.init();
};
