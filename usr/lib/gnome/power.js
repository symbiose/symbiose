Webos.Translation.load(function(t) {
	var battery = navigator.battery || navigator.mozBattery || navigator.webkitBattery;

	if (!battery) {
		return;
	}

	var item = $('<li></li>');
	var label = $('<a href="#"></a>').appendTo(item);
	var icon = $('<img />', { 'class': 'icon' }).appendTo(label);

	new SIndicator(item);

	var batteryIcons = {
		caution_charging: new W.Icon('status/battery-caution-charging-symbolic'),
		caution: new W.Icon('status/battery-caution-symbolic'),
		empty_charging: new W.Icon('status/battery-empty-charging-symbolic'),
		empty: new W.Icon('status/battery-empty-symbolic'),
		full_charged: new W.Icon('status/battery-full-charged-symbolic'),
		full_charging: new W.Icon('status/battery-full-charging-symbolic'),
		full: new W.Icon('status/battery-full-symbolic'),
		good_charging: new W.Icon('status/battery-good-charging-symbolic'),
		good: new W.Icon('status/battery-good-symbolic'),
		low_charging: new W.Icon('status/battery-low-charging-symbolic'),
		low: new W.Icon('status/battery-low-symbolic')
	};
	
	var updateBatteryStatusFn = function() {
		var name = '', title = '';

		var level = battery.level;
		if (level > 0.75) {
			name += 'full';
		} else if (level > 0.5) {
			name += 'good';
		} else if (level > 0.25) {
			name += 'low';
		} else {
			name += 'caution';
		}

		if (battery.charging) {
			name += '_charging';
			title = t.get('Battery charging, ${chargingMinutes} minutes remaining', { chargingMinutes: Math.round(battery.chargingTime / 60) });
			if (level == 1) {
				title = t.get('Battery fully charged');
			}
		} else if (level == 1) {
			name += '_charged';
			title = t.get('Battery fully charged, ${dischargingMinutes} minutes remaining', { chargingMinutes: Math.round(battery.dischargingTime / 60) });
		} else {
			title = t.get('Battery discharging, ${dischargingMinutes} minutes remaining', { chargingMinutes: Math.round(battery.dischargingTime / 60) });
		}

		//Probably : the battery is not present, it's a desktop pc.
		if (battery.charging && level == 1) {
			item.hide();
		} else {
			item.show();
		}

		icon
			.attr('src', batteryIcons[name])
			.attr('title', title);
	};

	battery.addEventListener('chargingchange', updateBatteryStatusFn);
	battery.addEventListener('chargingtimechange', updateBatteryStatusFn);
	battery.addEventListener('dischargingtimechange', updateBatteryStatusFn);
	battery.addEventListener('levelchange', updateBatteryStatusFn);

	updateBatteryStatusFn();
}, 'gnome');