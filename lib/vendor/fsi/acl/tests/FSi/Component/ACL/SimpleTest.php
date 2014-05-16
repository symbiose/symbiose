<?php

namespace FSi\Component\ACL;

class SimpleTest extends \PHPUnit_Framework_TestCase
{
    protected function getACL()
    {
        $acl = new ACL();
        $logger = new \Monolog\Logger('ACL');
        $logger->pushHandler(new \Monolog\Handler\SyslogHandler('ACL Tests'));
        $acl->setLogger($logger);
        return $acl;
    }

    public function testSimple()
    {
        $role = RoleSimple::factory('user');
        $resource = ResourceSimple::factory('class');
        $view = PermissionSimple::factory('view');
        $edit = PermissionSimple::factory('edit');

        $acl = $this->getACL();
        $acl->addPermission($view);
        $acl->addPermission($edit);
        $acl->addResource($resource);
        $acl->addRole($role);
        $acl->addACE(new ACEAllow($role, $resource, $view));

        $this->assertTrue(
            $acl->isAllowed($role, $resource, $view)
        );

        $this->assertFalse(
            $acl->isAllowed($role, $resource, $edit)
        );

        $acl->addACE(new ACEDeny($role, $resource, $edit));
        $this->assertFalse(
            $acl->isAllowed($role, $resource, $edit)
        );
    }

    public function testParentResource()
    {
        $role = RoleSimple::factory('user');
        $parentResource = ResourceSimple::factory('class');
        $childResource = ResourceSimple::factory('object');
        $grandChildResource = ResourceSimple::factory('field');
        $view = PermissionSimple::factory('view');
        $edit = PermissionSimple::factory('edit');

        $acl = $this->getACL();
        $acl->addPermission($view);
        $acl->addPermission($edit);
        $acl->addResource($parentResource);
        $acl->addResource($childResource, array($parentResource));
        $acl->addResource($grandChildResource, array($childResource));
        $acl->addRole($role);
        $acl->addACE(new ACEAllow($role, $parentResource, $view));
        $acl->addACE(new ACEAllow($role, $childResource, $edit));
        $acl->addACE(new ACEDeny($role, $grandChildResource, $edit));

        $this->assertTrue(
            $acl->isAllowed($role, $childResource, $view)
        );

        $this->assertFalse(
            $acl->isAllowed($role, $grandChildResource, $edit)
        );

        $this->assertTrue(
            $acl->isAllowed($role, $childResource, $edit)
        );

        $this->assertFalse(
            $acl->isAllowed($role, $parentResource, $edit)
        );
    }

    public function testMultipleParentResources()
    {
        $role = RoleSimple::factory('user');
        $parentResource = ResourceSimple::factory('class');
        $childResource = ResourceSimple::factory('object');
        $dependentResource1 = ResourceSimple::factory('parentObject1');
        $dependentResource2 = ResourceSimple::factory('parentObject2');
        $view = PermissionSimple::factory('view');
        $edit = PermissionSimple::factory('edit');

        $acl = $this->getACL();
        $acl->addPermission($view);
        $acl->addPermission($edit);
        $acl->addResource($dependentResource1);
        $acl->addResource($dependentResource2);
        $acl->addResource($parentResource, array($dependentResource1, $dependentResource2));
        $acl->addResource($childResource, array($parentResource));
        $acl->addRole($role);
        $acl->addACE(new ACEAllow($role, $dependentResource1, $view));
        $acl->addACE(new ACEAllow($role, $dependentResource2, $edit));

        $this->assertTrue(
            $acl->isAllowed($role, $childResource, $view)
        );

        $this->assertTrue(
            $acl->isAllowed($role, $childResource, $edit)
        );

        $acl->addACE(new ACEDeny($role, $parentResource, $view));
        $this->assertFalse(
            $acl->isAllowed($role, $childResource, $view)
        );
    }

    public function testParentRoles()
    {
        $userRole = RoleSimple::factory('user');
        $editorRole = RoleSimple::factory('editor');
        $publisherRole = RoleSimple::factory('publisher');
        $parentResource = ResourceSimple::factory('class');
        $childResource = ResourceSimple::factory('object');
        $view = PermissionSimple::factory('view');
        $edit = PermissionSimple::factory('edit');
        $publish = PermissionSimple::factory('publish');

        $acl = $this->getACL();
        $acl->addPermission($view);
        $acl->addPermission($edit);
        $acl->addPermission($publish);
        $acl->addResource($parentResource);
        $acl->addResource($childResource, array($parentResource));
        $acl->addRole($userRole);
        $acl->addRole($editorRole, array($userRole));
        $acl->addRole($publisherRole, array($editorRole));
        $acl->addACE(new ACEAllow($userRole, $parentResource, $view));
        $acl->addACE(new ACEAllow($editorRole, $parentResource, $edit));
        $acl->addACE(new ACEAllow($publisherRole, $parentResource, $publish));

        $this->assertTrue(
            $acl->isAllowed($publisherRole, $childResource, $view)
        );

        $this->assertTrue(
            $acl->isAllowed($publisherRole, $childResource, $edit)
        );

        $this->assertFalse(
            $acl->isAllowed($editorRole, $childResource, $publish)
        );
    }

    public function testMultipleParentRoles()
    {
        $userRole = RoleSimple::factory('user');
        $newsEditorRole = RoleSimple::factory('newsEditor');
        $articleEditorRole = RoleSimple::factory('articleEditor');
        $publisherRole = RoleSimple::factory('publisher');
        $newsResource = ResourceSimple::factory('newsClass');
        $articleResource = ResourceSimple::factory('articleClass');
        $view = PermissionSimple::factory('view');
        $edit = PermissionSimple::factory('edit');
        $publish = PermissionSimple::factory('publish');

        $acl = $this->getACL();
        $acl->addPermission($view);
        $acl->addPermission($edit);
        $acl->addPermission($publish);
        $acl->addResource($newsResource);
        $acl->addResource($articleResource);
        $acl->addRole($userRole);
        $acl->addRole($newsEditorRole);
        $acl->addRole($articleEditorRole);
        $acl->addRole($publisherRole, array($newsEditorRole, $articleEditorRole, $userRole));
        $acl->addACE(new ACEAllow($userRole, $newsResource, $view));
        $acl->addACE(new ACEAllow($userRole, $articleResource, $view));
        $acl->addACE(new ACEAllow($newsEditorRole, $newsResource, $edit));
        $acl->addACE(new ACEAllow($articleEditorRole, $articleResource, $edit));
        $acl->addACE(new ACEDeny($userRole, $newsResource, $publish));
        $acl->addACE(new ACEDeny($userRole, $articleResource, $publish));

        $this->assertFalse(
            $acl->isAllowed($publisherRole, $newsResource, $publish)
        );

        $this->assertFalse(
            $acl->isAllowed($publisherRole, $articleResource, $publish)
        );

        $this->assertTrue(
            $acl->isAllowed($publisherRole, $newsResource, $edit)
        );

        $this->assertTrue(
            $acl->isAllowed($publisherRole, $articleResource, $edit)
        );
    }

}
