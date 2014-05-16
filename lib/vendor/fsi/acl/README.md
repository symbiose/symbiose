# ACL - Comprehensive Access Control List system for PHP #

``FSi\ACL`` is a set of interfaces and classes which allows management of Access Control List in PHP. It's based on resources,
roles and permissions and can be used to build access control systems of almost any degree complexity.

## Setup and autoloading ##

If you are using the official extension repository, initial directory structure for 
the library should look like this:

    ...
    /ACL
        /bin
        /doc
        /lib
            /FSi
                /Component
                    /ACL
                        ...
        /tests
            ...
    ...

First of all we need to setup the autoloading of required extensions:

    $classLoader = new \Doctrine\Common\ClassLoader('FSi\\Component\\ACL', "/path/to/library/ACL/lib");
    $classLoader->register();

Then create ACL object, add resources, permissions, etc.

    $acl = new FSi\ACL();
    $acl->addPermission($somePermisssion);
    
    ...
    
    $acl->addResource($someResource);
    
    ...
    
    $acl->addRole($someRole);
    
    ...
    
    $acl->addACE($someACE);
    
    ...
    

And finally check access to specific resource:

    if ($acl->isAllowed($someRole, $someResource, $somePermission)) {
        
        ...
        
    }


## Understanding permissions ##

Permissions are defined as objects implementing ``PermissionInterface`` so virtually every object can act as a permission in the ACL
system. For simple cases there is a factory class ``PermissionSimple`` which represents permissions defined only by an identifier
unique across the ACL (i.e. ``'view'``, ``'edit'``, ``'delete'``, etc.). Permission objects must be registered in the ACL throught
``addPermission()`` method before defining any dependencies to them like access control entries.

## Understanding resources ##

Resources are defined as objects implementing ``ResourceInterface`` so virtually every object can act as a resource in the ACL
system. For simple cases there is a factory class ``ResourceSimple`` which represents resources defined only by an identifier
unique across the ACL (i.e. ``'news'``, ``'article'``, ``'offer'``, etc.). Resources can inherit from other resources in a multiple way.
For example resource A may inherit from three other resources X, Y and Z. Multiple inheritance is usefull if there is a need
to have multiple ways to grant access to specific resource, i.e. access to an object can be granted by granting access to its
class (resource representing this class) or some other object which it's associated with. Simple case is when access to some blog
post should be granted by granting access to the blog section it is associated with. Permission to some resource is granted if
permission to any of its parent resources is granted and permission to any of the parent resources is not revoked.

## Understanding roles ##

Roles are used to aggregate multiple access rights to multiple resources in one place and are defined as objects implementing
``RoleInterface`` so any object can act as a role in the ACL system. For simple cases there is a factory class ``RoleSimple`` which
represents role defined only by an identifier unique across the ACL (i.e. ``'user'``, ``'editor'``, ``'publisher'``, ``'admin'``, etc.).
Roles can inherit from other roles in a multiple way. For example role ``'editor'`` can inherit from roles ``'newsEditor'`` and
``'articleEditor'``. Role has granted permission to some resource if any of its parent roles has granted acces to this resource and
none of them has this permission revoked.

## Understanding Access Control Entries ##

Access Control Entry (ACE) are objects determining if specific permission to specific resource is granted for specific role.
There are two predefined ACE classes ``ACEAllow`` and ``ACEDeny`` which always returns true and false respectively, but any ACE
can be created with some complex logic determining when access is granted and when not.

## usage examples ##

Below is some example of how to use ACL directly:

        $userRole = RoleSimple::factory('user');
        $newsEditorRole = RoleSimple::factory('newsEditor');
        $articleEditorRole = RoleSimple::factory('articleEditor');
        $publisherRole = RoleSimple::factory('publisher');
        $newsResource = ResourceSimple::factory('newsClass');
        $articleResource = ResourceSimple::factory('articleClass');
        $view = PermissionSimple::factory('view');
        $edit = PermissionSimple::factory('edit');
        $publish = PermissionSimple::factory('publish');

        $acl = new ACL();
        $acl->addPermission($view);
        $acl->addPermission($edit);
        $acl->addPermission($publish);
        $acl->addResource($newsResource);
        $acl->addResource($articleResource);
        $acl->addRole($userRole);
        $acl->addRole($newsEditorRole);
        $acl->addRole($articleEditorRole);
        $acl->addRole($publisherRole, array($userRole, $newsEditorRole, $articleEditorRole));
        $acl->addACE(new ACEAllow($userRole, $newsResource, $view));
        $acl->addACE(new ACEAllow($userRole, $articleResource, $view));
        $acl->addACE(new ACEAllow($newsEditorRole, $newsResource, $edit));
        $acl->addACE(new ACEAllow($articleEditorRole, $articleResource, $edit));
        $acl->addACE(new ACEDeny($userRole, $newsResource, $publish));
        $acl->addACE(new ACEDeny($userRole, $articleResource, $publish));

        $acl->isAllowed($publisherRole, $newsResource, $publish)
        // returns false

        $acl->isAllowed($publisherRole, $articleResource, $publish)
        // returns false

        $acl->isAllowed($publisherRole, $newsResource, $edit)
        // returns true

        $acl->isAllowed($publisherRole, $articleResource, $edit)
        // returns true

## Debugging ACL ##

Considering complex dependincies between many roles, resources and permissions, it's often hard to trace when and why specific permissions are granted or revoked. In order to make this easier this component has built-in optional logging capabilty which uses Monolog to log every activity that takes place during one call of ``isAllowed()`` method. ``FSi\Component\ACL\ACL`` class has method ``setLogger()`` which takes ``Monolog\Logger`` instance as an argument. When logger is set, then messages will be logged to it at two different levels:

- ``INFO``
  * start of the checking process when ``isAllowed()`` method is called() 
  * every called ACE rule is logged along with the decision that the rule returned
  * end of the process including the final decision that is returned by ``isAllowed()`` method
- ``DEBUG``
  * additional information when walking up the resource tree
  * additional information when walking up the role tree
