<?php
namespace lib;

/**
 * A manifest call.
 * @author Simon Ser
 * @since 1.0beta3
 */
class ManifestCall extends \lib\Application {
	const WEBOS_VERSION_FILE = '/etc/version.txt';

	protected $manifestsPaths = array(
		'firefox' => '/usr/share/manifests/webos.webapp'
	);

	protected $managers;

	public function __construct() {
		parent::__construct();

		$this->name = 'manifestCall';

		$daos = new Daos($this);
		$this->managers = new Managers($daos);
	}

	public function run() {
		$fileManager = $this->managers->getManagerOf('file');
		$configManager = $this->managers->getManagerOf('config');

		if (!$this->httpRequest->getExists('type')) {
			$this->httpResponse()->addHeader('HTTP/1.0 400 Bad Request');
			throw new \RuntimeException('No manifest specified');
		}

		$manifestType = $this->httpRequest->getData('type');

		if (!isset($this->manifestsPaths[$manifestType])) {
			$this->httpResponse()->addHeader('HTTP/1.0 404 Not Found');
			throw new \RuntimeException('Invalid manifest type');
		}

		$manifestPath = $this->manifestsPaths[$manifestType];

		$manifestFile = $configManager->open($manifestPath);
		$manifest = $manifestFile->read();

		if ($manifestType == 'firefox') {
			if (isset($_SERVER['SERVER_NAME'])) {
				$manifest['name'] .= ' · '.$_SERVER['SERVER_NAME'];
			}
			//$manifest['version'] = $fileManager->read(self::WEBOS_VERSION_FILE);

			if (isset($_SERVER['REQUEST_URI'])) {
				$manifest['launch_path'] = preg_replace('#\/webos\.webapp$#', '', $_SERVER['REQUEST_URI']);
			}
		}

		$manifestStr = json_encode($manifest);

		$this->httpResponse->setCacheable();
		$this->httpResponse->addHeader('Content-Type: ' . $fileManager->mimetype($manifestPath));
		$this->httpResponse->addHeader('Content-Length: ' . strlen($manifestStr));

		$resp = new RawResponse();
		$resp->setValue($manifestStr);
		$this->httpResponse->setContent($resp);
	}
}