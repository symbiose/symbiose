<?php
namespace lib\ctrl\api;

/**
 * Manage apps from Firefox Marketplace.
 * @author $imon
 */
class FirefoxMarketplaceController extends \lib\ApiBackController {
	public function executeGetManifest($manifestUrl) {
		$ch = curl_init();
		curl_setopt($ch, CURLOPT_HEADER, false);
		curl_setopt($ch, CURLOPT_URL, $manifestUrl);
		curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
		curl_setopt($ch, CURLOPT_HTTPHEADER, array('Accept: application/x-web-app-manifest+json'));
		curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);

		$output = curl_exec($ch);
		curl_close($ch);

		return array('manifest' => $output);
	}

	public function executeCheckLaunchPage($launchPage) {
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

		$isLaunchable = true;

		if ($output === false) {
			$isLaunchable = false;
		} else {
			$headers = substr($output, 0, $headersSize);
			$headersLines = explode("\n", $headers);
			foreach($headersLines as $header) {
				$parts = explode(':', $header, 2);

				if (count($parts) == 2 && preg_match('#x-frame-options#i', trim($parts[0])) && preg_match('#"?sameorigin"?#i', trim($parts[1]))) {
					$isLaunchable = false;
					break;
				}
			}
		}

		return array('isLaunchable' => $isLaunchable, 'headers' => $headers);
	}
}