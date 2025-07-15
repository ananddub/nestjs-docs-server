import 'dart:convert';

import 'package:docs_clone_flutter/constants.dart';
import 'package:docs_clone_flutter/models/error_model.dart';
import 'package:docs_clone_flutter/models/user_model.dart';
import 'package:docs_clone_flutter/repository/local_storage_repository.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:http/http.dart';

final authRepositoryProvider = Provider(
  (ref) => AuthRepository(
    client: Client(),
    localStorageRepository: LocalStorageRepository(),
  ),
);

final userProvider = StateProvider<UserModel?>((ref) => null);

class AuthRepository {
  final Client _client;
  final LocalStorageRepository _localStorageRepository;
  AuthRepository({
    required Client client,
    required LocalStorageRepository localStorageRepository,
  })  : _client = client,
        _localStorageRepository = localStorageRepository;

  Future<ErrorModel> signUp({
    required String email,
    required String password,
    required String name,
  }) async {
    ErrorModel error = ErrorModel(
      error: 'Some unexpected error occurred.',
      data: null,
    );
    try {
      final userAcc = {
        'email': email,
        'password': password,
        'name': name,
      };

      var res = await _client.post(
        Uri.parse('$host/api/signup'),
        body: jsonEncode(userAcc),
        headers: {
          'Content-Type': 'application/json; charset=UTF-8',
        },
      );

      switch (res.statusCode) {
        case 200:
          final newUser = UserModel(
            email: email,
            name: name,
            profilePic: jsonDecode(res.body)['user']['profilePic'] ?? '',
            uid: jsonDecode(res.body)['user']['_id'],
            token: jsonDecode(res.body)['token'],
          );
          error = ErrorModel(error: null, data: newUser);
          _localStorageRepository.setToken(newUser.token);
          break;
        case 400:
          error = ErrorModel(
            error: jsonDecode(res.body)['error'],
            data: null,
          );
          break;
        default:
          error = ErrorModel(
            error: 'Something went wrong. Please try again.',
            data: null,
          );
      }
    } catch (e) {
      error = ErrorModel(
        error: e.toString(),
        data: null,
      );
    }
    return error;
  }

  Future<ErrorModel> login({
    required String email,
    required String password,
  }) async {
    ErrorModel error = ErrorModel(
      error: 'Some unexpected error occurred.',
      data: null,
    );
    try {
      final userAcc = {
        'email': email,
        'password': password,
      };

      var res = await _client.post(
        Uri.parse('$host/api/login'),
        body: jsonEncode(userAcc),
        headers: {
          'Content-Type': 'application/json; charset=UTF-8',
        },
      );

      switch (res.statusCode) {
        case 200:
          final newUser = UserModel(
            email: email,
            name: jsonDecode(res.body)['user']['name'],
            profilePic: jsonDecode(res.body)['user']['profilePic'] ?? '',
            uid: jsonDecode(res.body)['user']['_id'],
            token: jsonDecode(res.body)['token'],
          );
          error = ErrorModel(error: null, data: newUser);
          _localStorageRepository.setToken(newUser.token);
          break;
        case 400:
          error = ErrorModel(
            error: jsonDecode(res.body)['error'],
            data: null,
          );
          break;
        default:
          error = ErrorModel(
            error: 'Something went wrong. Please try again.',
            data: null,
          );
      }
    } catch (e) {
      error = ErrorModel(
        error: e.toString(),
        data: null,
      );
    }
    return error;
  }

  Future<ErrorModel> getUserData() async {
    ErrorModel error = ErrorModel(
      error: 'Some unexpected error occurred.',
      data: null,
    );
    try {
      String? token = await _localStorageRepository.getToken();

      if (token != null) {
        var res = await _client.get(Uri.parse('$host/'), headers: {
          'Content-Type': 'application/json; charset=UTF-8',
          'x-auth-token': token,
        });
        switch (res.statusCode) {
          case 200:
            final newUser = UserModel.fromJson(
              jsonEncode(
                jsonDecode(res.body)['user'],
              ),
            ).copyWith(token: token);
            error = ErrorModel(error: null, data: newUser);
            _localStorageRepository.setToken(newUser.token);
            break;
        }
      }
    } catch (e) {
      error = ErrorModel(
        error: e.toString(),
        data: null,
      );
    }
    return error;
  }

  void signOut() async {
    _localStorageRepository.setToken('');
  }
}
