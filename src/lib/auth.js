import { sb } from './supabase.js';

export var signIn = async function(email, pass) {
  return sb.auth.signInWithPassword({email: email, password: pass});
};

export var sendPasswordReset = async function(email) {
  return sb.auth.resetPasswordForEmail(email, {redirectTo: window.location.origin});
};

export var updatePassword = async function(newPw) {
  return sb.auth.updateUser({password: newPw});
};

export var uploadLogo = async function(path, file) {
  var upRes = await sb.storage.from('logos').upload(path, file, {upsert: true});
  if (upRes.error) return {error: upRes.error, url: null};
  var urlRes = sb.storage.from('logos').getPublicUrl(path);
  return {error: null, url: urlRes.data.publicUrl};
};

export var signOut = function() {
  return sb.auth.signOut();
};
