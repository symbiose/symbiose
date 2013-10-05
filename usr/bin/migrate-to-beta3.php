<?php
@set_time_limit(120);

$fileManager = $this->webos->managers()->get('File');
$userManager = $this->webos->managers()->get('User');

$authorisations = $this->webos->getAuthorization();
$authorisations->control('file.system.write');

$destFilename = 'webos-export';
$dest = $this->terminal->getAbsoluteLocation($destFilename);
if (!$fileManager->exists($dest)) {
	$fileManager->createDir($dest);
}

//USERS
echo 'Exporting users...'."\n";
$usersList = $userManager->getUsersList();

$passwdFile = $fileManager->get('/etc/passwords.xml');
$xml = new \DOMDocument;
$xml->loadXML($passwdFile->contents());
$usersPasswords = $xml->getElementsByTagName('user');

$usersOutput = array();
$permissionsOutput = array();

$i = 0;
$j = 0;
foreach ($usersList as $userId => $userData) {
	//Password
	$passwd = null;
	foreach ($usersPasswords as $userPasswd) {
		if ((int) $userPasswd->getAttribute('id') == $userId) {
			$userAttributes = $userPasswd->getElementsByTagName('attribute');
			foreach($userAttributes as $userAttribute) {
				if ($userAttribute->getAttribute('name') == 'password')
					$passwd = $userAttribute->getAttribute('value');
			}
		}
	}

	if (empty($passwd)) {
		echo 'WARNING: cannot migrate user #'.$userId.' "'.$userData['username'].'" : no password in database !'."\n";
		continue;
	}

	$usersOutput[] = array(
		'id' => $i,
		'username' => $userData['username'],
		'realname' => $userData['realname'],
		'password' => $passwd,
		'email' => (isset($userData['email'])) ? $userData['email'] : 'no-reply@example.com',
		'disabled' => (isset($userData['disabled']) && (int) $userData['disabled']) ? true : false
	);

	$userPermissions = $userManager->getAuthorisations($userId);
	$userPermissions[] = 'user.self.edit'; //New permission
	foreach($userPermissions as $permName) {
		$permissionsOutput[] = array(
			'id' => $j,
			'userId' => $i,
			'name' => $permName
		);

		$j++;
	}
	$i++;
}

$usersFile = $fileManager->createFileRecursive($dest.'/var/lib/jsondb/core/users.json');
$usersFile->setContents(json_encode($usersOutput));

$permsFile = $fileManager->createFileRecursive($dest.'/var/lib/jsondb/core/users_permissions.json');
$permsFile->setContents(json_encode($permissionsOutput));

echo ' '.count($usersOutput).' users exported, '.count($permissionsOutput).' permissions exported.'."\n";


//CONFIG
echo 'Exporting system configuration...'."\n";

echo 'Exporting quotas config...'."\n";
$oldConfigFile = $fileManager->get('/etc/quotas.json');
$oldConfig = json_decode($oldConfigFile->contents(), true);
$specificData = array();
if (isset($oldConfig['specific'])) {
	foreach($oldConfig['specific'] as $specific) {
		$specificData[] = array('~' => $specific['home']);
	}
}
$newConfig = array(
	'specific' => $specificData,
	'global' => array('~' => $oldConfig['global']['home'])
);
$newConfigFile = $fileManager->createFileRecursive($dest.'/etc/quotas.json');
$newConfigFile->setContents(json_encode($newConfig));

echo 'Exporting register config...'."\n";
$config = new \lib\models\Config($this->webos);
$config->load('/etc/register.xml');
$registrationEnabled = ((int) $config->get('register')) ? true : false;
$maxUsers = (int) $config->get('maxUsers');
$defaultAuths = explode(';', $config->get('authorizations'));
$defaultAuths[] = 'user.self.edit'; //New permission
$newConfig = array(
	'register' => $registrationEnabled,
	'maxUsers' => $maxUsers,
	'autoEnable' => true,
	'authorizations' => $defaultAuths
);
$newConfigFile = $fileManager->createFileRecursive($dest.'/etc/register.json');
$newConfigFile->setContents(json_encode($newConfig));

echo 'Exporting uploads config...'."\n";
$config = new \lib\models\Config($this->webos);
$config->load('/etc/uploads.xml');

$newConfig = array(
	'enabled' => ((int) $config->get('enabled')) ? true : false,
	'maxFileSize' => (int) $config->get('maxFileSize'),
	'allowedExtensions' => explode(';', $config->get('allowedExtensions'))
);

$newConfigFile = $fileManager->createFileRecursive($dest.'/etc/uploads.json');
$newConfigFile->setContents(json_encode($newConfig));


//CACHE
echo 'Deleting cache...'."\n";
if ($fileManager->exists('/var/cache/diskusage.json')) {
	$fileManager->get('/var/cache/diskusage.json')->delete();
}


echo 'Done !'."\n";
echo 'Migrated files are in "'.$destFilename.'". You can now update the webos to the latest commit. Then, copy files from "'.$destFilename.'/etc" to "/etc" and files from "'.$destFilename.'/var" to "/var".'."\n";
echo 'IMPORTANT NOTE: You must clear sessions (by deleting cookies for example) before upgrading.'."\n";