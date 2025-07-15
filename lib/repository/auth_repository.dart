import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:docs/models/error_model.dart';

final authRepositoryProvider = Provider((ref) => AuthRepository());
final userProvider = StateProvider<Map<String, dynamic>?>((ref) => null);

class AuthRepository {
  Future<ErrorModel> getUserData() async {
    try {
      // Simulate API call
      await Future.delayed(const Duration(seconds: 1));
      
      // Mock user data
      return ErrorModel(
        message: 'Success',
        data: {
          'id': '1',
          'name': 'Test User',
          'email': 'test@example.com',
        },
      );
    } catch (e) {
      return ErrorModel(message: e.toString());
    }
  }

  Future<void> signOut() async {
    // Simulate sign out
    await Future.delayed(const Duration(milliseconds: 500));
  }
}
