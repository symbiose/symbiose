<?php
namespace lib\ctrl\api;

use \lib\entities\FirefoxMarketplacePackageMetadata as PackageMetadata;
use \lib\entities\AppLauncher;

/**
 * Manage apps from Firefox Marketplace.
 * @author $imon
 */
class FirefoxMarketplaceController extends \lib\ApiBackController {
	public function executeGetManifest($manifestUrl) {
		if (function_exists('curl_init')) {
			$ch = curl_init();
			curl_setopt($ch, CURLOPT_HEADER, false);
			curl_setopt($ch, CURLOPT_URL, $manifestUrl);
			curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
			curl_setopt($ch, CURLOPT_HTTPHEADER, array('Accept: application/x-web-app-manifest+json'));
			curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);

			$output = curl_exec($ch);
			curl_close($ch);
		} else {
			$output = file_get_contents($manifestUrl);
		}

		if ($output === false) {
			throw new \RuntimeException('Cannot load app\'s manifest from "'.$manifestUrl.'"');
		}

		return array('manifest' => $output);
	}

	public function executeCheckLaunchPage($launchPage) {
		if (function_exists('curl_init')) {
			$ch = curl_init();
			curl_setopt($ch, CURLOPT_HEADER, true);
			//curl_setopt($ch, CURLOPT_NOBODY, true); //Sometimes this doesn't work
			curl_setopt($ch, CURLOPT_URL, $launchPage);
			curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
			curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
			curl_setopt($ch, CURLOPT_USERAGENT, $_SERVER['HTTP_USER_AGENT']);

			$output = curl_exec($ch);
			$headersSize = curl_getinfo($ch, CURLINFO_HEADER_SIZE);
			curl_close($ch);

			if ($output !== false) {
				$headers = substr($output, 0, $headersSize);
				$headersLines = explode("\n", $headers);
			}
		} else {
			$headersLines = get_headers($launchPage);
			$output = $headersLines;
		}

		$isLaunchable = true;

		if ($output === false) {
			$isLaunchable = false;
		} else {
			foreach($headersLines as $header) {
				$parts = explode(':', $header, 2);

				if (count($parts) == 2 && preg_match('#x-frame-options#i', trim($parts[0])) && preg_match('#"?(sameorigin|deny)"?#i', trim($parts[1]))) {
					$isLaunchable = false;
					break;
				}
			}
		}

		return array('isLaunchable' => $isLaunchable, 'headers' => $headersLines);
	}

	public function executeInstall($manifestUrl, $appData) {
		$localRepoManager = $this->managers()->getManagerOf('localRepository');
		$fileManager = $this->managers()->getManagerOf('file');
		$launcherManager = $this->managers()->getManagerOf('launcher');

		if ($appData['app_type'] != 'hosted') {
			throw new \RuntimeException('Packaged apps installation is not currently supported');
		}

		$webappDir = '/usr/lib/firefox-marketplace/webapps/'.$appData['slug'];

		//Download icons
		$isIconDownloaded = false;
		$iconName = 'firefox-marketplace.'.$appData['slug'];
		if (function_exists('curl_init')) {
			$ch = curl_init();
		}
		foreach($appData['icons'] as $iconSize => $iconUrl) {
			$iconUrlPath = parse_url($iconUrl, PHP_URL_PATH);
			if ($fileManager->extension($iconUrlPath) != 'png') {
				continue;
			}

			$iconDestPath = '/usr/share/icons/applications/'.((int) $iconSize).'/'.$iconName.'.png';

			if (isset($ch)) {
				curl_setopt($ch, CURLOPT_HEADER, false);
				curl_setopt($ch, CURLOPT_URL, $iconUrl);
				curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
				curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);

				$output = curl_exec($ch);
			} else {
				$output = file_get_contents($iconUrl);
			}

			if ($output === false) {
				continue;
			}

			$fileManager->createFile($iconDestPath, true);
			$fileManager->write($iconDestPath, $output);

			$isIconDownloaded = true;
		}
		if (isset($ch)) {
			curl_close($ch);
		}

		//Save app data
		$manifestData = $this->executeGetManifest($manifestUrl);
		$manifestContent = $manifestData['manifest'];
		$manifestUrlParts = parse_url($manifestUrl);
		$manifestOrigin = $manifestUrlParts['scheme'].'://'.$manifestUrlParts['host'];

		$appInstallDataDest = $webappDir.'/webapp.json';
		$appInstallData = array(
			'app' => $appData,
			'manifest' => json_decode($manifestContent, true),
			'origin' => $manifestOrigin,
			'manifestURL' => $manifestUrl,
			'manifestHash' => sha1($manifestContent)
		);
		if ($isIconDownloaded) {
			$appInstallData['localIcon'] = 'applications/'.$iconName;
		}

		$fileManager->createFile($appInstallDataDest, true);
		$fileManager->write($appInstallDataDest, json_encode($appInstallData));

		//Create launcher
		$launcher = new AppLauncher(array(
			'name' => 'firefox-marketplace.'.$appData['slug'],
			'title' => $appData['title'],
			'description' => $appData['description'],
			'command' => 'firefox-marketplace run '.$appData['slug']
		));
		if ($isIconDownloaded) {
			$launcher->setIcon('applications/'.$iconName);
		}
		$launcherManager->insertApp($launcher);

		//Register new app
		$pkg = new PackageMetadata(array(
			'name' => $appData['slug'],
			'title' => $appData['title'],
			'version' => $appData['current_version'],
			'description' => $appData['description'],
			'url' => $appData['support_url'],
			'maintainer' => $appData['author'],
			'updateDate' => strtotime($appData['created']),
			'categories' => $appData['categories'],
			'icons' => $appData['icons']
		));
		$localRepoManager->insert($pkg);

		return $pkg;
	}

	public function executeRemove($appName) {
		$localRepoManager = $this->managers()->getManagerOf('localRepository');
		$fileManager = $this->managers()->getManagerOf('file');
		$launcherManager = $this->managers()->getManagerOf('launcher');
		$configManager = $this->managers()->getManagerOf('config');

		if (!$localRepoManager->exists($appName)) {
			throw new \RuntimeException('This app "'.$appName.'" is not installed');
		}

		$webappDir = '/usr/lib/firefox-marketplace/webapps/'.$appName;

		$appInstallDataFile = $webappDir.'/webapp.json';
		$appDataFile = $configManager->open($appInstallDataFile);
		$appData = $appDataFile->read();

		//Remove icons
		$iconName = 'firefox-marketplace.'.$appName;
		foreach($appData['app']['icons'] as $iconSize => $iconUrl) {
			$iconPath = '/usr/share/icons/applications/'.((int) $iconSize).'/'.$iconName.'.png';

			$fileManager->delete($iconPath);
		}

		//Remove app data
		$fileManager->delete($webappDir, true);

		//Remove launcher
		$launcherManager->deleteApp('firefox-marketplace.'.$appName);

		//Unregister app
		$localRepoManager->delete($appName);
	}
}