<?php
namespace lib\ctrl\api;

/**
 * Manage apps from Firefox Marketplace.
 * @author $imon
 */
class FirefoxMarketplaceController extends \lib\ApiBackController {
	public function executeGetManifest($manifestUrl) {
		$ch = curl_init();
		curl_setopt($ch, CURLOPT_HEADER, 0);
		curl_setopt($ch, CURLOPT_URL, $manifestUrl);
		curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
		curl_setopt($ch, CURLOPT_HTTPHEADER, array('Accept: application/x-web-app-manifest+json'));
		curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);

		$output = curl_exec($ch);
		curl_close($ch);

		return array('manifest' => $output);
	}
}